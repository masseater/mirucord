import { and, eq, gte, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { db, message } from "#/shared/db/index.server";

import { deleteVectors } from "./vectors.server";

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

const deleteRows = (chunk: readonly string[]): Effect.Effect<void> =>
  Effect.asVoid(Effect.promise(() => db.delete(message).where(inArray(message.id, [...chunk]))));

const deleteMessages = (ids: readonly string[]): Effect.Effect<void> => {
  const chunks = Array.chunksOf(ids, ID_CHUNK);
  return deleteVectors(ids).pipe(
    Effect.andThen(Effect.forEach(chunks, deleteRows, { discard: true })),
  );
};

export { channelMessagesSince, deleteMessages, findStored };
export type { StoredMessage };
