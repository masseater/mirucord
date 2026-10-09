import { env } from "cloudflare:workers";
import { Array, Effect } from "effect";

const VECTOR_DELETE_LIMIT = 1000;

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

const upsertVectors = (vectors: readonly MessageVector[]): Effect.Effect<void> =>
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

export { deleteVectors, upsertVectors };
export type { MessageVector };
