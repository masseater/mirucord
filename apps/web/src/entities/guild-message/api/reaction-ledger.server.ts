import type { ReactionChange } from "@repo/ingest-util-gateway-contract";
import { and, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Match, Option, Order, pipe } from "effect";

import { BOUND_LIMIT } from "#/entities/guild-message/model/guild-message.schema";
import { pollVote, reaction } from "#/entities/guild-message/model/reaction.schema";

import type { ReactionLookup, ReactionPage, StoredReaction, StoredVote } from "./reaction-types";
import { unlessErased } from "./unless-erased";

type ReactionLedger = Readonly<{
  change: (changes: readonly ReactionChange[], erased: readonly string[]) => void;
  read: (lookup: ReactionLookup, erased: readonly string[]) => ReactionPage;
  forget: (userId: string) => void;
  forgetMessages: (messageIds: readonly string[]) => void;
  forgetChannel: (channelId: string) => void;
}>;

type Change<Kind extends ReactionChange["kind"]> = Extract<
  ReactionChange,
  Readonly<{ kind: Kind }>
>;

const addOf = (db: DrizzleSqliteDODatabase, change: Change<"add">): void => {
  const { kind: _kind, at, ...row } = change;
  db.insert(reaction)
    .values({ ...row, reactedAt: at })
    .onConflictDoNothing()
    .run();
};

const removeOf = (
  db: DrizzleSqliteDODatabase,
  { messageId, userId, emoji, burst }: Change<"remove">,
): void => {
  const matching = and(
    eq(reaction.messageId, messageId),
    eq(reaction.userId, userId),
    eq(reaction.emoji, emoji),
    eq(reaction.burst, burst),
  );
  db.delete(reaction).where(matching).run();
};

const clearOf = (db: DrizzleSqliteDODatabase, change: Change<"clear">): void => {
  const emoji = Option.map(Option.fromNullOr(change.emoji), (key) => eq(reaction.emoji, key));
  db.delete(reaction)
    .where(and(eq(reaction.messageId, change.messageId), ...Option.toArray(emoji)))
    .run();
};

const voteOf = (
  db: DrizzleSqliteDODatabase,
  { messageId, channelId, userId, answerId, at }: Change<"vote">,
): void => {
  db.insert(pollVote)
    .values({ messageId, channelId, userId, answerId, votedAt: at })
    .onConflictDoNothing()
    .run();
};

const unvoteOf = (
  db: DrizzleSqliteDODatabase,
  { messageId, userId, answerId }: Change<"unvote">,
): void => {
  const matching = and(
    eq(pollVote.messageId, messageId),
    eq(pollVote.userId, userId),
    eq(pollVote.answerId, answerId),
  );
  db.delete(pollVote).where(matching).run();
};

const changeOf = (db: DrizzleSqliteDODatabase, change: ReactionChange): void => {
  Match.value(change).pipe(
    Match.discriminatorsExhaustive("kind")({
      add: (added) => {
        addOf(db, added);
      },
      remove: (removed) => {
        removeOf(db, removed);
      },
      clear: (cleared) => {
        clearOf(db, cleared);
      },
      vote: (voted) => {
        voteOf(db, voted);
      },
      unvote: (unvoted) => {
        unvoteOf(db, unvoted);
      },
    }),
  );
};

const inChunks = <Row>(
  ids: readonly string[],
  query: (chunk: readonly string[]) => readonly Row[],
): readonly Row[] => pipe(Array.chunksOf(ids, BOUND_LIMIT), Array.flatMap(query));

const reactionRowsOf = (
  db: DrizzleSqliteDODatabase,
  lookup: ReactionLookup,
): readonly StoredReaction[] => {
  const select = (...where: readonly SQL[]): readonly StoredReaction[] =>
    db
      .select()
      .from(reaction)
      .where(and(...where))
      .all();
  const byMessage = Option.map(Option.fromNullOr(lookup.messageId), (id) =>
    select(eq(reaction.messageId, id)),
  );
  const byUser = Option.map(Option.fromNullOr(lookup.userIds), (ids) =>
    inChunks(ids, (chunk) => select(inArray(reaction.userId, [...chunk]))),
  );
  const byAuthor = Option.map(Option.fromNullOr(lookup.authorIds), (ids) =>
    inChunks(ids, (chunk) => select(inArray(reaction.messageAuthorId, [...chunk]))),
  );
  return pipe(
    byMessage,
    Option.orElse(() => byUser),
    Option.orElse(() => byAuthor),
    Option.getOrElse(() => select()),
  );
};

const voteRowsOf = (db: DrizzleSqliteDODatabase, lookup: ReactionLookup): readonly StoredVote[] => {
  const select = (...where: readonly SQL[]): readonly StoredVote[] =>
    db
      .select()
      .from(pollVote)
      .where(and(...where))
      .all();
  const byMessage = Option.map(Option.fromNullOr(lookup.messageId), (id) =>
    select(eq(pollVote.messageId, id)),
  );
  const byUser = Option.map(Option.fromNullOr(lookup.userIds), (ids) =>
    inChunks(ids, (chunk) => select(inArray(pollVote.userId, [...chunk]))),
  );
  return pipe(
    byMessage,
    Option.orElse(() => byUser),
    Option.getOrElse(() => select()),
  );
};

type Filtered = Readonly<{ channelId: string; userId: string; at: number }>;

const keeps =
  (lookup: ReactionLookup, erased: readonly string[]) =>
  ({ channelId, userId, at }: Filtered): boolean => {
    const visible = lookup.channelIds.includes(channelId);
    const person = Option.match(Option.fromNullOr(lookup.userIds), {
      onNone: () => true,
      onSome: (ids) => ids.includes(userId),
    });
    const after = Option.match(Option.fromNullOr(lookup.since), {
      onNone: () => true,
      onSome: (since) => at >= since,
    });
    const before = Option.match(Option.fromNullOr(lookup.until), {
      onNone: () => true,
      onSome: (until) => at <= until,
    });
    return visible && person && after && before && !erased.includes(userId);
  };

const newestFirst = <Row>(timeOf: (row: Row) => number): Order.Order<Row> =>
  Order.flip(Order.mapInput(Order.Number, timeOf));

const readOf = (
  db: DrizzleSqliteDODatabase,
  lookup: ReactionLookup,
  erased: readonly string[],
): ReactionPage => {
  const kept = keeps(lookup, erased);
  const byAuthor = (row: StoredReaction): boolean =>
    Option.match(Option.fromNullOr(lookup.authorIds), {
      onNone: () => true,
      onSome: (ids) => ids.includes(row.messageAuthorId ?? ""),
    });
  const reactions = pipe(
    reactionRowsOf(db, lookup),
    Array.filter((row) => kept({ ...row, at: row.reactedAt }) && byAuthor(row)),
  );
  const votes = pipe(
    voteRowsOf(db, lookup),
    Array.filter((row) => kept({ ...row, at: row.votedAt })),
  );
  const page = <Row>(rows: readonly Row[]): readonly Row[] =>
    rows.slice(lookup.offset, lookup.offset + lookup.limit);
  return {
    reactionTotal: reactions.length,
    reactions: page(
      Array.sort(
        reactions,
        newestFirst(({ reactedAt }: StoredReaction) => reactedAt),
      ),
    ),
    voteTotal: votes.length,
    votes: page(
      Array.sort(
        votes,
        newestFirst(({ votedAt }: StoredVote) => votedAt),
      ),
    ),
  };
};

const reactionLedger = (db: DrizzleSqliteDODatabase): ReactionLedger => ({
  change: unlessErased((change: ReactionChange) => {
    changeOf(db, change);
  }),
  read: (lookup, erased) => readOf(db, lookup, erased),
  forget: (userId) => {
    db.delete(reaction).where(eq(reaction.userId, userId)).run();
    db.delete(pollVote).where(eq(pollVote.userId, userId)).run();
    db.update(reaction)
      .set({ messageAuthorId: Option.getOrNull(Option.none<string>()) })
      .where(eq(reaction.messageAuthorId, userId))
      .run();
  },
  forgetMessages: (messageIds) => {
    for (const chunk of Array.chunksOf(messageIds, BOUND_LIMIT)) {
      db.delete(reaction)
        .where(inArray(reaction.messageId, [...chunk]))
        .run();
      db.delete(pollVote)
        .where(inArray(pollVote.messageId, [...chunk]))
        .run();
    }
  },
  forgetChannel: (channelId) => {
    db.delete(reaction).where(eq(reaction.channelId, channelId)).run();
    db.delete(pollVote).where(eq(pollVote.channelId, channelId)).run();
  },
});

export { reactionLedger };
export type { ReactionLedger };
