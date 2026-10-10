import { env } from "cloudflare:workers";
import { Array, Effect } from "effect";

const VECTOR_DELETE_LIMIT = 1000;
const VECTOR_GET_LIMIT = 20;

const deleteVectors = (ids: readonly string[]): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(ids, VECTOR_DELETE_LIMIT),
    (chunk) => Effect.promise(() => env.MESSAGES.deleteByIds([...chunk])),
    { discard: true },
  );

type MessageVector = Readonly<{
  id: string;
  values: readonly number[];
  guildId: string;
  channelId: string;
}>;

const upsertAll = (vectors: Array.NonEmptyReadonlyArray<MessageVector>): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.promise(() =>
      env.MESSAGES.upsert(
        vectors.map(({ id, values, guildId, channelId }) => ({
          id,
          values: [...values],
          metadata: { guildId, channelId },
        })),
      ),
    ),
  );

const upsertVectors = (vectors: readonly MessageVector[]): Effect.Effect<void> =>
  Array.match(vectors, { onEmpty: () => Effect.void, onNonEmpty: upsertAll });

const indexedIds = (ids: readonly string[]): Effect.Effect<ReadonlySet<string>> =>
  Effect.forEach(Array.chunksOf(ids, VECTOR_GET_LIMIT), (chunk) =>
    Effect.promise(() => env.MESSAGES.getByIds([...chunk])),
  ).pipe(Effect.map((found) => new Set(found.flat().map(({ id }) => id))));

export { deleteVectors, indexedIds, upsertVectors };
export type { MessageVector };
