import { and, eq, gte, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { db, message } from "#/shared/db/index.server";

import { deleteVectors } from "./vectors.server";
import type { VectorizeError } from "./vectors.server";

const ID_CHUNK = 50;

type StoredMessage = Readonly<{ id: string; editedAt: Option.Option<number> }>;

const findStored = (ids: readonly string[]): Effect.Effect<readonly StoredMessage[]> =>
  Effect.forEach(Array.chunksOf(ids, ID_CHUNK), (chunk) =>
    Effect.promise(() =>
      db
        .select({ id: message.id, editedAt: message.editedAt })
        .from(message)
        .where(inArray(message.id, [...chunk])),
    ),
  ).pipe(
    Effect.map((chunks) =>
      chunks.flat().map(({ id, editedAt }) => ({
        id,
        editedAt: Option.map(Option.fromNullOr(editedAt), (date) => date.getTime()),
      })),
    ),
  );

const channelMessagesSince = ({
  channelId,
  since,
}: Readonly<{
  channelId: string;
  since: Option.Option<DateTime.DateTime>;
}>): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    db
      .select({ id: message.id })
      .from(message)
      .where(
        Option.match(since, {
          onNone: () => eq(message.channelId, channelId),
          onSome: (date) =>
            and(eq(message.channelId, channelId), gte(message.createdAt, DateTime.toDate(date))),
        }),
      ),
  ).pipe(Effect.map((rows) => rows.map(({ id }) => id)));

const MESSAGE_OWNER = { guild: message.guildId, channel: message.channelId } as const;

const forgetMessagesOf = (
  owner: keyof typeof MESSAGE_OWNER,
  ownerId: string,
): Effect.Effect<void, VectorizeError> =>
  Effect.promise(() =>
    db.select({ id: message.id }).from(message).where(eq(MESSAGE_OWNER[owner], ownerId)),
  ).pipe(Effect.flatMap((rows) => deleteVectors(rows.map(({ id }) => id))));

const forgetGuildMessages = (guildId: string): Effect.Effect<void, VectorizeError> =>
  forgetMessagesOf("guild", guildId);

const forgetChannelMessages = (channelId: string): Effect.Effect<void, VectorizeError> =>
  forgetMessagesOf("channel", channelId);

const deleteRows = (chunk: readonly string[]): Effect.Effect<void> =>
  Effect.asVoid(Effect.promise(() => db.delete(message).where(inArray(message.id, [...chunk]))));

const deleteMessages = (ids: readonly string[]): Effect.Effect<void, VectorizeError> => {
  const chunks = Array.chunksOf(ids, ID_CHUNK);
  return deleteVectors(ids).pipe(
    Effect.andThen(Effect.forEach(chunks, deleteRows, { discard: true })),
  );
};

export {
  channelMessagesSince,
  deleteMessages,
  findStored,
  forgetChannelMessages,
  forgetGuildMessages,
};
export type { StoredMessage };
export type { VectorizeError } from "./vectors.server";
