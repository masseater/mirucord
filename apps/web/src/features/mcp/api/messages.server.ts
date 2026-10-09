import { env } from "cloudflare:workers";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { embed } from "#/shared/ai/index.server";
import { openGuildKey, openMessage } from "#/shared/crypto/index.server";
import { db, message } from "#/shared/db/index.server";

import type { GuildScope } from "./scope.server";

type StoredMessage = Readonly<{
  id: string;
  guildId: string;
  channelId: string;
  sealed: string;
  createdAt: DateTime.Utc;
  edited: boolean;
}>;

type MessageRow = Readonly<{
  id: string;
  guildId: string;
  channelId: string;
  sealed: string;
  createdAt: Date;
  editedAt: Date | null;
}>;

type MessageView = Readonly<{
  id: string;
  channelId: string;
  author: string;
  content: string;
  attachments: readonly Readonly<{ filename: string; url: string }>[];
  createdAt: string;
  edited: boolean;
  url: string;
}>;

const MESSAGE_COLUMNS = {
  id: message.id,
  guildId: message.guildId,
  channelId: message.channelId,
  sealed: message.sealed,
  createdAt: message.createdAt,
  editedAt: message.editedAt,
};

const loadStored = (
  load: () => Promise<readonly MessageRow[]>,
): Effect.Effect<readonly StoredMessage[]> =>
  Effect.promise(load).pipe(
    Effect.map((rows) =>
      rows.map(({ createdAt, editedAt, ...row }) => ({
        ...row,
        createdAt: DateTime.fromDateUnsafe(createdAt),
        edited: Option.isSome(Option.fromNullOr(editedAt)),
      })),
    ),
  );

const openStored = (
  scope: GuildScope,
  stored: readonly StoredMessage[],
): Effect.Effect<readonly MessageView[]> =>
  openGuildKey(scope.guild.wrappedKey).pipe(
    Effect.flatMap((key) =>
      Effect.forEach(
        stored.filter(
          ({ guildId, channelId }) =>
            guildId === scope.guild.guildId && scope.visible.includes(channelId),
        ),
        (row) =>
          openMessage(row.sealed, key, {
            guildId: row.guildId,
            channelId: row.channelId,
            messageId: row.id,
          }).pipe(
            Effect.map((body) => ({
              id: row.id,
              channelId: row.channelId,
              author: body.authorName,
              content: body.content,
              attachments: body.attachments,
              createdAt: DateTime.formatIso(row.createdAt),
              edited: row.edited,
              url: `https://discord.com/channels/${row.guildId}/${row.channelId}/${row.id}`,
            })),
          ),
      ),
    ),
  );

const findStored = (ids: readonly string[]): Effect.Effect<readonly StoredMessage[]> =>
  loadStored(() =>
    db
      .select(MESSAGE_COLUMNS)
      .from(message)
      .where(inArray(message.id, [...ids])),
  ).pipe(
    Effect.map((stored) =>
      ids.flatMap((id) => Option.toArray(Array.findFirst(stored, (row) => row.id === id))),
    ),
  );

type SearchRequest = Readonly<{
  scope: GuildScope;
  query: string;
  channelIds: readonly string[];
  limit: number;
}>;

const queryVectors = (
  { scope, channelIds, limit }: SearchRequest,
  vector: readonly number[],
): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    env.MESSAGES.query([...vector], {
      topK: limit,
      returnMetadata: "none",
      filter: { guildId: scope.guild.guildId, channelId: { $in: [...channelIds] } },
    }),
  ).pipe(Effect.map(({ matches }) => matches.map(({ id }) => id)));

const searchMessages = (request: SearchRequest): Effect.Effect<readonly MessageView[]> =>
  embed([request.query]).pipe(
    Effect.map(Array.head),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed([]),
        onSome: (vector) => queryVectors(request, vector),
      }),
    ),
    Effect.flatMap(findStored),
    Effect.flatMap((stored) => openStored(request.scope, stored)),
  );

type ReadRequest = Readonly<{
  scope: GuildScope;
  channelId: string;
  before: Option.Option<string>;
  limit: number;
}>;

const createdAtOf = (
  channelId: string,
  messageId: string,
): Effect.Effect<Option.Option<DateTime.Utc>> =>
  loadStored(() =>
    db
      .select(MESSAGE_COLUMNS)
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.channelId, channelId))),
  ).pipe(Effect.map((rows) => Option.map(Array.head(rows), ({ createdAt }) => createdAt)));

const readStored = (
  { channelId, limit }: ReadRequest,
  before: Option.Option<DateTime.Utc>,
): Effect.Effect<readonly StoredMessage[]> =>
  loadStored(() =>
    db
      .select(MESSAGE_COLUMNS)
      .from(message)
      .where(
        Option.match(before, {
          onNone: () => eq(message.channelId, channelId),
          onSome: (date) =>
            and(eq(message.channelId, channelId), lt(message.createdAt, DateTime.toDate(date))),
        }),
      )
      .orderBy(desc(message.createdAt))
      .limit(limit),
  );

const readMessages = (request: ReadRequest): Effect.Effect<readonly MessageView[]> =>
  Option.match(request.before, {
    onNone: () => Effect.succeed(Option.none<DateTime.Utc>()),
    onSome: (messageId) => createdAtOf(request.channelId, messageId),
  }).pipe(
    Effect.flatMap((before) => readStored(request, before)),
    Effect.flatMap((stored) => openStored(request.scope, stored)),
  );

export { readMessages, searchMessages };
export type { MessageView, ReadRequest, SearchRequest };
