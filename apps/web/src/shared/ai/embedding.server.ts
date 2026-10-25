import { env } from "cloudflare:workers";
import { Array, Effect, Option, pipe, Schedule, Schema, String as Str } from "effect";

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

const taggedError = Schema.TaggedError;

class EmbeddingError extends taggedError<EmbeddingError, { readonly brand: unique symbol }>()(
  "EmbeddingError",
  {
    cause: Schema.Unknown,
  },
) {}

type Embedded =
  | Readonly<{ status: "embedded"; vectors: readonly Quantized[] }>
  | Readonly<{ status: "over-budget" }>;

const clip = (text: string): string => pipe(text, Str.slice(CLIP_START, MAX_CHARS));

const estimateNeurons = (texts: Array.NonEmptyReadonlyArray<string>): number =>
  (texts.length *
    (Math.max(
      ...pipe(
        texts,
        Array.map((text) => clip(text).length),
      ),
    ) +
      SPECIAL_TOKENS) *
    NEURONS_PER_MILLION_TOKENS) /
  MILLION;

const runModel = (
  texts: Array.NonEmptyReadonlyArray<string>,
): Effect.Effect<readonly (readonly number[])[], EmbeddingError> =>
  Effect.tryPromise({
    try: () =>
      env.AI.run(EMBED_MODEL, {
        text: pipe(
          texts,
          Array.map((text) => clip(text)),
        ),
        truncate_inputs: true,
      }),
    catch: (cause) => EmbeddingError.make({ cause }),
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
              data.length === texts.length &&
              pipe(
                data,
                Array.every((vector) => vector.length === DIMENSIONS),
              ),
          ),
        ),
      ),
    ),
    Effect.mapError((cause) =>
      EmbeddingError.make({ cause: `${EMBED_MODEL} returned no embeddings: ${String(cause)}` }),
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
    vectors: pipe(
      vectors,
      Array.map((vector) => quantize(vector)),
    ),
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
