import { env } from "cloudflare:workers";
import { Array, Data, Effect, Schedule } from "effect";

const VECTOR_DELETE_LIMIT = 100;
const VECTOR_GET_LIMIT = 20;
const RETRY_TIMES = 4;
const RETRY_BASE = "200 millis";

class VectorizeError extends Data.TaggedError("VectorizeError")<{ readonly cause: unknown }> {}

const callVectorize = <Result>(
  call: () => Promise<Result>,
): Effect.Effect<Result, VectorizeError> =>
  Effect.tryPromise({ try: call, catch: (cause) => new VectorizeError({ cause }) }).pipe(
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
  );

const deleteVectors = (ids: readonly string[]): Effect.Effect<void, VectorizeError> =>
  Effect.forEach(
    Array.chunksOf(ids, VECTOR_DELETE_LIMIT),
    (chunk) => callVectorize(() => env.MESSAGES.deleteByIds([...chunk])),
    { discard: true },
  );

type MessageVector = Readonly<{
  id: string;
  values: readonly number[];
  guildId: string;
  channelId: string;
}>;

const upsertAll = (
  vectors: Array.NonEmptyReadonlyArray<MessageVector>,
): Effect.Effect<void, VectorizeError> =>
  Effect.asVoid(
    callVectorize(() =>
      env.MESSAGES.upsert(
        vectors.map(({ id, values, guildId, channelId }) => ({
          id,
          values: [...values],
          metadata: { guildId, channelId },
        })),
      ),
    ),
  );

const upsertVectors = (vectors: readonly MessageVector[]): Effect.Effect<void, VectorizeError> =>
  Array.match(vectors, { onEmpty: () => Effect.void, onNonEmpty: upsertAll });

const indexedIds = (ids: readonly string[]): Effect.Effect<ReadonlySet<string>, VectorizeError> =>
  Effect.forEach(Array.chunksOf(ids, VECTOR_GET_LIMIT), (chunk) =>
    callVectorize(() => env.MESSAGES.getByIds([...chunk])),
  ).pipe(Effect.map((found) => new Set(found.flat().map(({ id }) => id))));

export { deleteVectors, indexedIds, upsertVectors, VectorizeError };
export type { MessageVector };
