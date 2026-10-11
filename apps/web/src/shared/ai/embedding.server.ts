import { env } from "cloudflare:workers";
import { Array, Data, Effect, Schedule } from "effect";

const MODEL = "@cf/baai/bge-m3";
const RETRY_TIMES = 4;
const RETRY_BASE = "200 millis";

class EmbeddingError extends Data.TaggedError("EmbeddingError")<{ readonly cause: unknown }> {}

const embedAll = (
  texts: Array.NonEmptyReadonlyArray<string>,
): Effect.Effect<readonly (readonly number[])[], EmbeddingError> =>
  Effect.tryPromise({
    try: () => env.AI.run(MODEL, { text: [...texts], truncate_inputs: true }),
    catch: (cause) => new EmbeddingError({ cause }),
  }).pipe(
    Effect.flatMap((output) => {
      if ("data" in output && output.data.length === texts.length) {
        return Effect.succeed(output.data);
      }
      return Effect.fail(new EmbeddingError({ cause: `${MODEL} returned no embeddings` }));
    }),
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
  );

const embed = (
  texts: readonly string[],
): Effect.Effect<readonly (readonly number[])[], EmbeddingError> =>
  Array.match(texts, { onEmpty: () => Effect.succeed([]), onNonEmpty: embedAll });

export { embed, EmbeddingError };
