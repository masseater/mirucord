import { env } from "cloudflare:workers";
import { Effect, Layer, Option, Schedule, Schema, String } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";
import { fromUint8Array } from "js-base64";

import {
  GEMMA_MODEL,
  gemmaNeurons,
  gemmaText,
  settleGemma,
  spendNeurons,
} from "#/shared/ai/index.server";
import type { GemmaOutput } from "#/shared/ai/index.server";

const DESCRIBE_MODEL = GEMMA_MODEL;
const OK_STATUS = 200;
const MAX_TOKENS = 160;
const RETRY_TIMES = 2;
const RETRY_BASE = "500 millis";
const MAX_IMAGE_BYTES = 4_000_000;
const RESERVED_INPUT_TOKENS = 1000;
const DESCRIBABLE_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROMPT =
  "この画像を検索で見つけられるよう、日本語で1〜2文で説明してください。写っている物や料理の名前、読める文字があればその内容を具体的に書いてください。説明だけを答えてください。";

const taggedError = Schema.TaggedError;

class DescribeError extends taggedError<DescribeError, { readonly brand: unique symbol }>()(
  "DescribeError",
  {
    stage: Schema.Literals(["budget", "fetch", "model"]),
    reason: Schema.String,
  },
) {}

const reasonOf = (cause: unknown): string =>
  Option.liftPredicate(cause, (value): value is Error => value instanceof Error).pipe(
    Option.match({ onNone: () => "unknown", onSome: ({ name, message }) => `${name}: ${message}` }),
  );

type ImageSource = Readonly<{ url: string; contentType: string; size: number }>;

const isDescribable = ({ contentType, size }: ImageSource): boolean =>
  DESCRIBABLE_TYPES.has(contentType) && size <= MAX_IMAGE_BYTES;

type FetchedImage = Readonly<{ data: string; contentType: string }>;

const fetchImage = ({
  url,
  contentType,
}: ImageSource): Effect.Effect<FetchedImage, DescribeError, HttpClient.HttpClient> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => client.get(url)),
    Effect.filterOrFail(
      ({ status }) => status === OK_STATUS,
      ({ status }) => DescribeError.make({ stage: "fetch", reason: `status ${status}` }),
    ),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.map((buffer) => ({ data: fromUint8Array(new Uint8Array(buffer)), contentType })),
    Effect.catchTag(["HttpClientError"], (cause) =>
      Effect.fail(DescribeError.make({ stage: "fetch", reason: cause.reason.name })),
    ),
  );

const RESERVED_NEURONS = gemmaNeurons({ input: RESERVED_INPUT_TOKENS, output: MAX_TOKENS });

const reserveNeurons = spendNeurons("live", RESERVED_NEURONS).pipe(
  Effect.filterOrFail(
    (granted) => granted,
    () => DescribeError.make({ stage: "budget", reason: "daily neuron budget spent" }),
  ),
);

const runModel = ({ data, contentType }: FetchedImage): Effect.Effect<string, DescribeError> =>
  Effect.tryPromise({
    try: () =>
      env.AI.run(DESCRIBE_MODEL, {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: `data:${contentType};base64,${data}` } },
            ],
          },
        ],
        max_tokens: MAX_TOKENS,
        chat_template_kwargs: { enable_thinking: false },
      }),
    catch: (cause) => DescribeError.make({ stage: "model", reason: reasonOf(cause) }),
  }).pipe(
    Effect.tap((output: GemmaOutput) => settleGemma({ output, reserved: RESERVED_NEURONS })),
    Effect.map((output) =>
      Option.match(gemmaText(output), { onNone: () => "", onSome: String.trim }),
    ),
  );

const describeWithClient = (
  source: ImageSource,
): Effect.Effect<Option.Option<string>, never, HttpClient.HttpClient> =>
  fetchImage(source).pipe(
    Effect.flatMap((image) => reserveNeurons.pipe(Effect.andThen(runModel(image)))),
    Effect.retry({
      schedule: Schedule.exponential(RETRY_BASE),
      times: RETRY_TIMES,
      while: ({ stage }) => stage !== "budget",
    }),
    Effect.map(Option.liftPredicate(String.isNonEmpty)),
    Effect.catchTag("DescribeError", ({ stage, reason }) =>
      Effect.logWarning("Could not describe an image").pipe(
        Effect.annotateLogs({ stage, reason }),
        Effect.as(Option.none<string>()),
      ),
    ),
  );

const describeImage = (source: ImageSource): Effect.Effect<Option.Option<string>> =>
  Effect.scoped(
    Layer.build(FetchHttpClient.layer).pipe(
      Effect.flatMap((context) => describeWithClient(source).pipe(Effect.provideContext(context))),
    ),
  ).pipe(Effect.withSpan("describeImage"));

export { DESCRIBE_MODEL, describeImage, isDescribable };
export type { ImageSource };
