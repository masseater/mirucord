import { env } from "cloudflare:workers";
import { Array, Data, Effect, Schedule } from "effect";

const MODEL = "@cf/pfnet/plamo-embedding-1b";
const QUERY_INSTRUCTION = "次の文章に対して、関連する文章を検索してください: ";
const RETRY_TIMES = 4;
const RETRY_BASE = "200 millis";

class EmbeddingError extends Data.TaggedError("EmbeddingError")<{ readonly cause: unknown }> {}

const embedAll = (
  texts: Array.NonEmptyReadonlyArray<string>,
): Effect.Effect<readonly (readonly number[])[], EmbeddingError> =>
  Effect.tryPromise({
    try: () => env.AI.run(MODEL, { text: [...texts] }),
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

const embedQuery = (query: string): Effect.Effect<readonly number[], EmbeddingError> =>
  embedAll([`${QUERY_INSTRUCTION}${query}`]).pipe(
    Effect.flatMap((vectors) =>
      Effect.fromOption(Array.head(vectors)).pipe(
        Effect.mapError(() => new EmbeddingError({ cause: `${MODEL} returned no embeddings` })),
      ),
    ),
  );

export { embed, embedQuery, EmbeddingError };
