import { and, count, eq, gte, inArray, lte, min } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import {
  BOUND_LIMIT,
  guildMessage,
  TRACKED_COLUMNS,
} from "#/entities/guild-message/model/guild-message.schema";

import { authorQueries } from "./author-queries.server";
import type {
  AuthoredMessage,
  AuthorPage,
  ChannelCount,
  ChannelOldest,
  CreatedRange,
  SealedMessage,
  StoredState,
  TrackedRow,
} from "./store-types";

const boundsOf = ({ from, upTo }: CreatedRange): readonly SQL[] => {
  const lower = Option.map(Option.fromNullOr(from), (time) => gte(guildMessage.createdAt, time));
  const upper = Option.map(Option.fromNullOr(upTo), (time) => lte(guildMessage.createdAt, time));
  return [...Option.toArray(lower), ...Option.toArray(upper)];
};

const trackedRows = (db: DrizzleSqliteDODatabase, ids: readonly string[]): readonly TrackedRow[] =>
  pipe(
    Array.chunksOf(ids, BOUND_LIMIT),
    Array.flatMap((chunk) =>
      db
        .select(TRACKED_COLUMNS)
        .from(guildMessage)
        .where(inArray(guildMessage.id, [...chunk]))
        .all(),
    ),
  );

const storedStates = (
  db: DrizzleSqliteDODatabase,
  ids: readonly string[],
): readonly StoredState[] =>
  pipe(
    Array.chunksOf(ids, BOUND_LIMIT),
    Array.flatMap((chunk) =>
      db
        .select({
          id: guildMessage.id,
          editedAt: guildMessage.editedAt,
          describedWith: guildMessage.describedWith,
        })
        .from(guildMessage)
        .where(inArray(guildMessage.id, [...chunk]))
        .all(),
    ),
  );

const idsInChannelOf = (
  db: DrizzleSqliteDODatabase,
  channelId: string,
  ids: readonly string[],
): readonly string[] => {
  const inChannel = eq(guildMessage.channelId, channelId);
  return pipe(
    Array.chunksOf(ids, BOUND_LIMIT),
    Array.flatMap((chunk) => {
      const listed = inArray(guildMessage.id, [...chunk]);
      const rows = db
        .select({ id: guildMessage.id })
        .from(guildMessage)
        .where(and(inChannel, listed))
        .all();
      return pipe(
        rows,
        Array.map(({ id }) => id),
      );
    }),
  );
};

const idsBetweenOf = (
  db: DrizzleSqliteDODatabase,
  channelId: string,
  range: CreatedRange,
): readonly string[] => {
  const conditions = [eq(guildMessage.channelId, channelId), ...boundsOf(range)];
  const rows = db
    .select({ id: guildMessage.id })
    .from(guildMessage)
    .where(and(...conditions))
    .all();
  return pipe(
    rows,
    Array.map(({ id }) => id),
  );
};

const countsByChannel = (
  db: DrizzleSqliteDODatabase,
  channelIds: readonly string[],
): readonly ChannelCount[] =>
  pipe(
    Array.chunksOf(channelIds, BOUND_LIMIT),
    Array.flatMap((chunk) =>
      db
        .select({ channelId: guildMessage.channelId, messages: count() })
        .from(guildMessage)
        .where(inArray(guildMessage.channelId, [...chunk]))
        .groupBy(guildMessage.channelId)
        .all(),
    ),
  );

const oldestByChannel = (
  db: DrizzleSqliteDODatabase,
  channelIds: readonly string[],
): readonly ChannelOldest[] =>
  pipe(
    Array.chunksOf(channelIds, BOUND_LIMIT),
    Array.flatMap((chunk) =>
      db
        .select({ channelId: guildMessage.channelId, oldest: min(guildMessage.createdAt) })
        .from(guildMessage)
        .where(inArray(guildMessage.channelId, [...chunk]))
        .groupBy(guildMessage.channelId)
        .all(),
    ),
    Array.flatMap(({ channelId, oldest }) =>
      Option.toArray(
        Option.map(Option.fromNullOr(oldest), (createdAt) => ({ channelId, oldest: createdAt })),
      ),
    ),
  );

const authorsOf = (
  db: DrizzleSqliteDODatabase,
  ids: readonly string[],
): readonly AuthoredMessage[] =>
  pipe(
    Array.chunksOf(ids, BOUND_LIMIT),
    Array.flatMap((chunk) =>
      db
        .select({ id: guildMessage.id, authorId: guildMessage.authorId })
        .from(guildMessage)
        .where(inArray(guildMessage.id, [...chunk]))
        .all(),
    ),
  );

type MessageQueries = Readonly<{
  tracked: (ids: readonly string[]) => readonly TrackedRow[];
  stored: (ids: readonly string[]) => readonly StoredState[];
  idsInChannel: (channelId: string, ids: readonly string[]) => readonly string[];
  idsBetween: (channelId: string, range: CreatedRange) => readonly string[];
  countByChannel: (channelIds: readonly string[]) => readonly ChannelCount[];
  oldestByChannel: (channelIds: readonly string[]) => readonly ChannelOldest[];
  authors: (ids: readonly string[]) => readonly AuthoredMessage[];
  byAuthor: (page: AuthorPage) => readonly SealedMessage[];
}>;

const messageQueries = (db: DrizzleSqliteDODatabase): MessageQueries => ({
  tracked: (ids) => trackedRows(db, ids),
  stored: (ids) => storedStates(db, ids),
  idsInChannel: (channelId, ids) => idsInChannelOf(db, channelId, ids),
  idsBetween: (channelId, range) => idsBetweenOf(db, channelId, range),
  countByChannel: (channelIds) => countsByChannel(db, channelIds),
  oldestByChannel: (channelIds) => oldestByChannel(db, channelIds),
  authors: (ids) => authorsOf(db, ids),
  byAuthor: authorQueries(db),
});

export { messageQueries };
export type { MessageQueries };
