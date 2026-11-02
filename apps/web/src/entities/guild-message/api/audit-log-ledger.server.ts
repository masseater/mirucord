import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import { auditEntry } from "#/entities/guild-message/model/audit-entry.schema";

type StoredAuditEntry = typeof auditEntry.$inferSelect;

type AuditLookup = Readonly<{
  userIds: readonly string[] | null;
  actionTypes: readonly number[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

type AuditPage = Readonly<{ total: number; entries: readonly StoredAuditEntry[] }>;

type AuditLogLedger = Readonly<{
  write: (entries: readonly StoredAuditEntry[], erased: readonly string[]) => void;
  read: (lookup: AuditLookup, erased: readonly string[]) => AuditPage;
  forget: (userId: string) => void;
}>;

const involves =
  (erased: readonly string[]) =>
  ({ userId, targetId }: StoredAuditEntry): boolean =>
    pipe(
      [userId, targetId],
      Array.some((id) =>
        Option.isSome(Option.filter(Option.fromNullOr(id), (known) => erased.includes(known))),
      ),
    );

const conditionsOf = (lookup: AuditLookup): readonly SQL[] => [
  ...Option.toArray(
    Option.flatMap(Option.fromNullOr(lookup.userIds), (ids) =>
      Option.fromUndefinedOr(
        or(inArray(auditEntry.userId, [...ids]), inArray(auditEntry.targetId, [...ids])),
      ),
    ),
  ),
  ...Option.toArray(
    Option.map(Option.fromNullOr(lookup.actionTypes), (types) =>
      inArray(auditEntry.actionType, [...types]),
    ),
  ),
  ...Option.toArray(
    Option.map(Option.fromNullOr(lookup.since), (since) => gte(auditEntry.at, since)),
  ),
  ...Option.toArray(
    Option.map(Option.fromNullOr(lookup.until), (until) => lte(auditEntry.at, until)),
  ),
];

const readOf = (
  db: DrizzleSqliteDODatabase,
  lookup: AuditLookup,
  erased: readonly string[],
): AuditPage => {
  const where = and(...conditionsOf(lookup));
  const matching = pipe(
    db
      .select()
      .from(auditEntry)
      .where(where)
      .orderBy(desc(auditEntry.at), desc(auditEntry.id))
      .all(),
    Array.filter((entry) => !involves(erased)(entry)),
  );
  return {
    total: matching.length,
    entries: matching.slice(lookup.offset, lookup.offset + lookup.limit),
  };
};

const auditLogLedger = (db: DrizzleSqliteDODatabase): AuditLogLedger => ({
  write: (entries, erased) => {
    for (const entry of entries) {
      if (!involves(erased)(entry)) {
        db.insert(auditEntry).values(entry).onConflictDoNothing().run();
      }
    }
  },
  read: (lookup, erased) => readOf(db, lookup, erased),
  forget: (userId) => {
    db.delete(auditEntry)
      .where(or(eq(auditEntry.userId, userId), eq(auditEntry.targetId, userId)))
      .run();
  },
});

export { auditLogLedger };
export type { AuditLogLedger, AuditLookup, AuditPage, StoredAuditEntry };
