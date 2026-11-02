import { and, desc, eq, gte, inArray, lte, notInArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import {
  guildInvite,
  inviteJoin,
  inviteSnapshot,
} from "#/entities/guild-message/model/invite.schema";

import { precisionOf, usedSince } from "./invite-diff";
import type { InviteCount } from "./invite-diff";

type StoredInviteJoin = typeof inviteJoin.$inferSelect;

type Joiner = Readonly<{ userId: string; joinedAt: number }>;

type InviteJoinWrite = Readonly<{
  fetchedAt: number;
  invites: readonly InviteCount[];
  joiners: readonly Joiner[];
}>;

type InviteJoinLookup = Readonly<{
  userIds: readonly string[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

type InviteJoinPage = Readonly<{ total: number; joins: readonly StoredInviteJoin[] }>;

type InviteLedger = Readonly<{
  record: (write: InviteJoinWrite, erased: readonly string[]) => void;
  read: (lookup: InviteJoinLookup, erased: readonly string[]) => InviteJoinPage;
  forget: (userId: string) => void;
}>;

const SNAPSHOT_ROW = 1;
const NO_INVITER = Option.getOrNull(Option.none<string>());

const conditionsOf = (lookup: InviteJoinLookup): readonly SQL[] => [
  ...Option.toArray(
    Option.map(Option.fromNullOr(lookup.userIds), (ids) => inArray(inviteJoin.userId, [...ids])),
  ),
  ...Option.toArray(
    Option.map(Option.fromNullOr(lookup.since), (since) => gte(inviteJoin.joinedAt, since)),
  ),
  ...Option.toArray(
    Option.map(Option.fromNullOr(lookup.until), (until) => lte(inviteJoin.joinedAt, until)),
  ),
];

const SNAPSHOT_KEY = eq(inviteSnapshot.id, SNAPSHOT_ROW);

const lastFetchOf = (db: DrizzleSqliteDODatabase): Option.Option<number> => {
  const row = db
    .select({ fetchedAt: inviteSnapshot.fetchedAt })
    .from(inviteSnapshot)
    .where(SNAPSHOT_KEY)
    .get();
  return Option.map(Option.fromUndefinedOr(row), ({ fetchedAt }) => fetchedAt);
};

const newJoiners = (
  db: DrizzleSqliteDODatabase,
  joiners: readonly Joiner[],
  erased: readonly string[],
): readonly Joiner[] => {
  const ids = pipe(
    joiners,
    Array.map(({ userId }) => userId),
  );
  const known = pipe(
    db
      .select({ userId: inviteJoin.userId, joinedAt: inviteJoin.joinedAt })
      .from(inviteJoin)
      .where(inArray(inviteJoin.userId, ids))
      .all(),
    Array.map(({ userId, joinedAt }) => `${userId}/${joinedAt}`),
  );
  return pipe(
    joiners,
    Array.filter(
      ({ userId, joinedAt }) =>
        !erased.includes(userId) && !known.includes(`${userId}/${joinedAt}`),
    ),
  );
};

const replaceSnapshot = (db: DrizzleSqliteDODatabase, write: InviteJoinWrite): void => {
  const codes = pipe(
    write.invites,
    Array.map(({ code }) => code),
  );
  db.delete(guildInvite).where(notInArray(guildInvite.code, codes)).run();
  for (const invite of write.invites) {
    db.insert(guildInvite)
      .values(invite)
      .onConflictDoUpdate({ target: guildInvite.code, set: invite })
      .run();
  }
  db.insert(inviteSnapshot)
    .values({ id: SNAPSHOT_ROW, fetchedAt: write.fetchedAt })
    .onConflictDoUpdate({ target: inviteSnapshot.id, set: { fetchedAt: write.fetchedAt } })
    .run();
};

const recordOf = (
  db: DrizzleSqliteDODatabase,
  write: InviteJoinWrite,
  erased: readonly string[],
): void => {
  const last = lastFetchOf(db);
  if (Option.exists(last, (at) => at > write.fetchedAt)) {
    return;
  }
  const joiners = newJoiners(db, write.joiners, erased);
  const candidates = Option.match(last, {
    onNone: () => [],
    onSome: () => usedSince(write.invites)(db.select().from(guildInvite).all()),
  });
  const precision = precisionOf(joiners)(candidates);
  for (const { userId, joinedAt } of joiners) {
    db.insert(inviteJoin).values({ userId, joinedAt, precision, candidates }).run();
  }
  replaceSnapshot(db, write);
};

const withoutErased =
  (erased: readonly string[]) =>
  (join: StoredInviteJoin): StoredInviteJoin => ({
    ...join,
    candidates: pipe(
      join.candidates,
      Array.map((candidate) =>
        Option.match(
          Option.filter(Option.fromNullOr(candidate.inviterId), (id) => erased.includes(id)),
          {
            onNone: () => candidate,
            onSome: () => ({ ...candidate, inviterId: NO_INVITER }),
          },
        ),
      ),
    ),
  });

const readOf = (
  db: DrizzleSqliteDODatabase,
  lookup: InviteJoinLookup,
  erased: readonly string[],
): InviteJoinPage => {
  const where = and(...conditionsOf(lookup));
  const matching = pipe(
    db
      .select()
      .from(inviteJoin)
      .where(where)
      .orderBy(desc(inviteJoin.joinedAt), desc(inviteJoin.userId))
      .all(),
    Array.filter(({ userId }) => !erased.includes(userId)),
    Array.map(withoutErased(erased)),
  );
  return {
    total: matching.length,
    joins: matching.slice(lookup.offset, lookup.offset + lookup.limit),
  };
};

const inviteLedger = (db: DrizzleSqliteDODatabase): InviteLedger => ({
  record: (write, erased) => {
    recordOf(db, write, erased);
  },
  read: (lookup, erased) => readOf(db, lookup, erased),
  forget: (userId) => {
    db.delete(inviteJoin).where(eq(inviteJoin.userId, userId)).run();
  },
});

export { inviteLedger };
export type {
  InviteJoinLookup,
  InviteJoinPage,
  InviteJoinWrite,
  InviteLedger,
  Joiner,
  StoredInviteJoin,
};
