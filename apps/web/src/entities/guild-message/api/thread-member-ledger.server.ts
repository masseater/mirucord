import type { ThreadMemberChange } from "@repo/ingest-util-gateway-contract";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, Order, pipe } from "effect";

import { BOUND_LIMIT } from "#/entities/guild-message/model/guild-message.schema";
import { threadMember } from "#/entities/guild-message/model/thread-member.schema";

import { unlessErased } from "./unless-erased";

type StoredThreadMember = typeof threadMember.$inferSelect;

type ThreadMemberLookup = Readonly<{
  threadIds: readonly string[];
  userIds: readonly string[] | null;
  includeLeft: boolean;
  limit: number;
  offset: number;
}>;

type ThreadMemberPage = Readonly<{ total: number; members: readonly StoredThreadMember[] }>;

type ThreadMemberLedger = Readonly<{
  change: (changes: readonly ThreadMemberChange[], erased: readonly string[]) => void;
  read: (lookup: ThreadMemberLookup, erased: readonly string[]) => ThreadMemberPage;
  forget: (userId: string) => void;
  forgetThread: (threadId: string) => void;
}>;

const STILL_THERE = Option.getOrNull(Option.none<number>());

const changeOf = (db: DrizzleSqliteDODatabase, change: ThreadMemberChange): void => {
  const { threadId, userId, at } = change;
  if (change.kind === "join") {
    db.insert(threadMember)
      .values({ threadId, userId, joinedAt: at })
      .onConflictDoUpdate({
        target: [threadMember.threadId, threadMember.userId],
        set: { joinedAt: at, leftAt: STILL_THERE },
      })
      .run();
    return;
  }
  db.update(threadMember)
    .set({ leftAt: at })
    .where(
      and(
        eq(threadMember.threadId, threadId),
        eq(threadMember.userId, userId),
        isNull(threadMember.leftAt),
      ),
    )
    .run();
};

const rowsOf = (
  db: DrizzleSqliteDODatabase,
  threadIds: readonly string[],
): readonly StoredThreadMember[] =>
  pipe(
    Array.chunksOf(threadIds, BOUND_LIMIT),
    Array.flatMap((chunk) =>
      db
        .select()
        .from(threadMember)
        .where(inArray(threadMember.threadId, [...chunk]))
        .all(),
    ),
  );

const keeps =
  (lookup: ThreadMemberLookup, erased: readonly string[]) =>
  ({ userId, leftAt }: StoredThreadMember): boolean => {
    const person = Option.match(Option.fromNullOr(lookup.userIds), {
      onNone: () => true,
      onSome: (ids) => ids.includes(userId),
    });
    const present = lookup.includeLeft || Option.isNone(Option.fromNullOr(leftAt));
    return person && present && !erased.includes(userId);
  };

const earliestFirst = Order.mapInput(Order.Number, ({ joinedAt }: StoredThreadMember) => joinedAt);

const readOf = (
  db: DrizzleSqliteDODatabase,
  lookup: ThreadMemberLookup,
  erased: readonly string[],
): ThreadMemberPage => {
  const matching = pipe(rowsOf(db, lookup.threadIds), Array.filter(keeps(lookup, erased)));
  return {
    total: matching.length,
    members: Array.sort(matching, earliestFirst).slice(lookup.offset, lookup.offset + lookup.limit),
  };
};

const threadMemberLedger = (db: DrizzleSqliteDODatabase): ThreadMemberLedger => ({
  change: unlessErased((change: ThreadMemberChange) => {
    changeOf(db, change);
  }),
  read: (lookup, erased) => readOf(db, lookup, erased),
  forget: (userId) => {
    db.delete(threadMember).where(eq(threadMember.userId, userId)).run();
  },
  forgetThread: (threadId) => {
    db.delete(threadMember).where(eq(threadMember.threadId, threadId)).run();
  },
});

export { threadMemberLedger };
export type { StoredThreadMember, ThreadMemberLedger, ThreadMemberLookup, ThreadMemberPage };
