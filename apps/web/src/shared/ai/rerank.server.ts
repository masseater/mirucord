import { env } from "cloudflare:workers";
import { Array, Data, Effect, Number, Option, Schedule } from "effect";

import { settleNeurons, spendNeurons } from "./budget.server";

const RERANK_MODEL = "@cf/baai/bge-reranker-base";
const NEURONS_PER_MILLION_TOKENS = 283;
const MILLION = 1_000_000;
const MAX_CHARS = 512;
const SPECIAL_TOKENS = 3;
const CLIP_START = 0;
const RETRY_TIMES = 2;
const RETRY_BASE = "200 millis";

class RerankError extends Data.TaggedError("RerankError")<{ readonly cause: unknown }> {}

type Reranked =
  | Readonly<{ status: "reranked"; scores: readonly number[] }>
  | Readonly<{ status: "over-budget" }>;

type RerankRequest = Readonly<{ query: string; texts: readonly string[] }>;

const clip = (text: string): string => text.slice(CLIP_START, MAX_CHARS);

const estimateNeurons = ({ query, texts }: RerankRequest): number =>
  (Number.sumAll(texts.map((text) => clip(query).length + clip(text).length + SPECIAL_TOKENS)) *
    NEURONS_PER_MILLION_TOKENS) /
  MILLION;

const runModel = ({
  query,
  texts,
}: RerankRequest): Effect.Effect<readonly number[], RerankError> => {
  const inputs = {
    query: clip(query),
    contexts: texts.map((text) => ({ text: clip(text) })),
    top_k: texts.length,
  };
  return Effect.tryPromise({
    try: () => env.AI.run(RERANK_MODEL, inputs),
    catch: (cause) => new RerankError({ cause }),
  }).pipe(
    Effect.flatMap(({ response }) => {
      const scores = new Map(
        (response ?? []).flatMap(({ id, score }) =>
          Option.toArray(Option.all([Option.fromUndefinedOr(id), Option.fromUndefinedOr(score)])),
        ),
      );
      return Effect.fromOption(
        Option.all(texts.map((_text, index) => Option.fromUndefinedOr(scores.get(index)))),
      );
    }),
    Effect.mapError(
      (cause) => new RerankError({ cause: `${RERANK_MODEL} returned no scores: ${String(cause)}` }),
    ),
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
  );
};

const rerankWithin = Effect.fn("rerankTexts")(function* rerankWithin(request: RerankRequest) {
  const neurons = estimateNeurons(request);
  yield* Effect.annotateCurrentSpan({ texts: request.texts.length, neurons });
  if (!(yield* spendNeurons("query", neurons))) {
    return { status: "over-budget" } satisfies Reranked;
  }
  const scores = yield* runModel(request).pipe(Effect.tapError(() => settleNeurons(-neurons)));
  return { status: "reranked", scores } satisfies Reranked;
});

const rerankTexts = (request: RerankRequest): Effect.Effect<Reranked, RerankError> =>
  Array.match(request.texts, {
    onEmpty: () => Effect.succeed({ status: "reranked", scores: [] }),
    onNonEmpty: () => rerankWithin(request),
  });

export { rerankTexts };
export type { Reranked, RerankError, RerankRequest };
