import { env } from "cloudflare:workers";
import { Array, Data, Effect, Option, Schedule } from "effect";

import { settleNeurons, spendNeurons } from "./budget.server";
import type { Priority } from "./budget.server";
import { DIMENSIONS, quantize } from "./vector";
import type { Quantized } from "./vector";

const EMBED_MODEL = "@cf/baai/bge-m3";
const NEURONS_PER_MILLION_TOKENS = 1075;
const MILLION = 1_000_000;
const MAX_CHARS = 4000;
const SPECIAL_TOKENS = 2;
const CLIP_START = 0;
const RETRY_TIMES = 4;
const RETRY_BASE = "200 millis";

class EmbeddingError extends Data.TaggedError("EmbeddingError")<{ readonly cause: unknown }> {}

type Embedded =
  | Readonly<{ status: "embedded"; vectors: readonly Quantized[] }>
  | Readonly<{ status: "over-budget" }>;

const clip = (text: string): string => text.slice(CLIP_START, MAX_CHARS);

const estimateNeurons = (texts: Array.NonEmptyReadonlyArray<string>): number =>
  (texts.length *
    (Math.max(...texts.map((text) => clip(text).length)) + SPECIAL_TOKENS) *
    NEURONS_PER_MILLION_TOKENS) /
  MILLION;

const runModel = (
  texts: Array.NonEmptyReadonlyArray<string>,
): Effect.Effect<readonly (readonly number[])[], EmbeddingError> =>
  Effect.tryPromise({
    try: () =>
      env.AI.run(EMBED_MODEL, { text: texts.map((text) => clip(text)), truncate_inputs: true }),
    catch: (cause) => new EmbeddingError({ cause }),
  }).pipe(
    Effect.flatMap((output) =>
      Effect.fromOption(
        Option.some(output).pipe(
          Option.flatMap((value) => {
            if ("data" in value) {
              return Option.fromUndefinedOr(value.data);
            }
            return Option.none();
          }),
          Option.filter(
            (data) =>
              data.length === texts.length && data.every((vector) => vector.length === DIMENSIONS),
          ),
        ),
      ),
    ),
    Effect.mapError(
      (cause) =>
        new EmbeddingError({ cause: `${EMBED_MODEL} returned no embeddings: ${String(cause)}` }),
    ),
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
  );

const embedWithin = Effect.fn("embedTexts")(function* embedWithin(
  priority: Priority,
  texts: Array.NonEmptyReadonlyArray<string>,
) {
  const neurons = estimateNeurons(texts);
  yield* Effect.annotateCurrentSpan({ texts: texts.length, neurons });
  if (!(yield* spendNeurons(priority, neurons))) {
    return { status: "over-budget" } satisfies Embedded;
  }
  const vectors = yield* runModel(texts).pipe(Effect.tapError(() => settleNeurons(-neurons)));
  return {
    status: "embedded",
    vectors: vectors.map((vector) => quantize(vector)),
  } satisfies Embedded;
});

const embedTexts = ({
  priority,
  texts,
}: Readonly<{ priority: Priority; texts: readonly string[] }>): Effect.Effect<
  Embedded,
  EmbeddingError
> =>
  Array.match(texts, {
    onEmpty: () => Effect.succeed({ status: "embedded", vectors: [] }),
    onNonEmpty: (nonEmpty) => embedWithin(priority, nonEmpty),
  });

export { embedTexts };
export type { Embedded, EmbeddingError };
