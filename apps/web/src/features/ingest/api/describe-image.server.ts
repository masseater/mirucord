import { env } from "cloudflare:workers";
import { Array, Data, Effect, Layer, Option, Schedule, Semaphore, String } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

const DESCRIBE_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const OK_STATUS = 200;
const MAX_TOKENS = 160;
const RETRY_TIMES = 2;
const RETRY_BASE = "500 millis";
const MAX_IMAGE_BYTES = 4_000_000;
const BINARY_CHUNK = 32_768;
const ONE_AT_A_TIME = 1;
const IMAGE_SLOTS = Semaphore.makeUnsafe(ONE_AT_A_TIME);
const DESCRIBABLE_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);
const PROMPT =
  "この画像を検索で見つけられるよう、日本語で1〜2文で説明してください。写っている物や料理の名前、読める文字があればその内容を具体的に書いてください。説明だけを答えてください。";

class DescribeError extends Data.TaggedError("DescribeError")<{
  readonly stage: "fetch" | "model";
  readonly reason: string;
}> {}

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
      ({ status }) => new DescribeError({ stage: "fetch", reason: `status ${status}` }),
    ),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.map((buffer) => {
      const bytes = new Uint8Array(buffer);
      const binary = Array.makeBy(Math.ceil(bytes.length / BINARY_CHUNK), (index) => {
        const start = index * BINARY_CHUNK;
        return globalThis.String.fromCharCode(...bytes.subarray(start, start + BINARY_CHUNK));
      }).join("");
      return { data: btoa(binary), contentType };
    }),
    Effect.catchTag(["HttpClientError"], (cause) =>
      Effect.fail(new DescribeError({ stage: "fetch", reason: cause.reason.name })),
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
    catch: (cause) => new DescribeError({ stage: "model", reason: reasonOf(cause) }),
  }).pipe(
    Effect.map(({ choices }) =>
      Array.head(choices).pipe(
        Option.flatMap(({ message }) => Option.fromNullishOr(message.content)),
        Option.match({ onNone: () => "", onSome: String.trim }),
      ),
    ),
  );

const describeWithClient = (
  source: ImageSource,
): Effect.Effect<Option.Option<string>, never, HttpClient.HttpClient> =>
  fetchImage(source).pipe(
    Effect.flatMap(runModel),
    Semaphore.withPermits(IMAGE_SLOTS, ONE_AT_A_TIME),
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
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
