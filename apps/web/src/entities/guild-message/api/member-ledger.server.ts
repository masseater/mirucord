import { and, inArray, isNull } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import { guildMember } from "#/entities/guild-message/model/guild-member.schema";
import { BOUND_LIMIT } from "#/entities/guild-message/model/guild-message.schema";

import type { MemberLookup, MemberWrite, StoredMember } from "./member-types";

const STILL_HERE = Option.getOrNull(Option.none<number>());

type MemberLedger = Readonly<{
  write: (request: MemberWrite, erased: readonly string[]) => void;
  depart: (userIds: readonly string[], now: number) => void;
  read: (lookup: MemberLookup, erased: readonly string[]) => readonly StoredMember[];
  forget: (userId: string) => void;
}>;

const presentIds = (db: DrizzleSqliteDODatabase): readonly string[] =>
  pipe(
    db
      .select({ userId: guildMember.userId })
      .from(guildMember)
      .where(isNull(guildMember.leftAt))
      .all(),
    Array.map(({ userId }) => userId),
  );

const departOf = (db: DrizzleSqliteDODatabase, userIds: readonly string[], now: number): void => {
  for (const chunk of Array.chunksOf(userIds, BOUND_LIMIT)) {
    db.update(guildMember)
      .set({ leftAt: now, updatedAt: now })
      .where(and(inArray(guildMember.userId, [...chunk]), isNull(guildMember.leftAt)))
      .run();
  }
};

const writeOf = (
  db: DrizzleSqliteDODatabase,
  { members, now, coverage }: MemberWrite,
  erased: readonly string[],
): void => {
  const kept = pipe(
    members,
    Array.filter(({ userId }) => !erased.includes(userId)),
  );
  for (const { joinedAt, ...member } of kept) {
    const row = { ...member, leftAt: STILL_HERE, updatedAt: now };
    const joined = Option.match(Option.fromNullOr(joinedAt), {
      onNone: () => ({}),
      onSome: (at) => ({ joinedAt: at }),
    });
    db.insert(guildMember)
      .values({ ...row, joinedAt })
      .onConflictDoUpdate({ target: guildMember.userId, set: { ...row, ...joined } })
      .run();
  }
  if (coverage === "complete") {
    const listed = new Set(
      pipe(
        members,
        Array.map(({ userId }) => userId),
      ),
    );
    departOf(
      db,
      pipe(
        presentIds(db),
        Array.filter((userId) => !listed.has(userId)),
      ),
      now,
    );
  }
};

const rowsOf = (
  db: DrizzleSqliteDODatabase,
  userIds: readonly string[] | null,
): readonly StoredMember[] => {
  const columns = {
    userId: guildMember.userId,
    sealed: guildMember.sealed,
    roles: guildMember.roles,
    bot: guildMember.bot,
    joinedAt: guildMember.joinedAt,
    leftAt: guildMember.leftAt,
  };
  return Option.match(Option.fromNullOr(userIds), {
    onNone: () => db.select(columns).from(guildMember).all(),
    onSome: (ids) =>
      pipe(
        Array.chunksOf(ids, BOUND_LIMIT),
        Array.flatMap((chunk) =>
          db
            .select(columns)
            .from(guildMember)
            .where(inArray(guildMember.userId, [...chunk]))
            .all(),
        ),
      ),
  });
};

const readOf = (
  db: DrizzleSqliteDODatabase,
  { userIds, includeLeft }: MemberLookup,
  erased: readonly string[],
): readonly StoredMember[] =>
  pipe(
    rowsOf(db, userIds),
    Array.filter(({ userId }) => !erased.includes(userId)),
    Array.filter(({ leftAt }) => includeLeft || Option.isNone(Option.fromNullOr(leftAt))),
  );

const memberLedger = (db: DrizzleSqliteDODatabase): MemberLedger => ({
  write: (request, erased) => {
    writeOf(db, request, erased);
  },
  depart: (userIds, now) => {
    departOf(db, userIds, now);
  },
  read: (lookup, erased) => readOf(db, lookup, erased),
  forget: (userId) => {
    db.delete(guildMember)
      .where(inArray(guildMember.userId, [userId]))
      .run();
  },
});

export { memberLedger };
export type { MemberLedger };
