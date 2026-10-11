import { env } from "cloudflare:workers";
import { Data, Effect, Layer, Option, Schedule, String } from "effect";
import { Base64 } from "effect/encoding";
import { FetchHttpClient, HttpClient } from "effect/http";

const DESCRIBE_MODEL = "@cf/google/gemma-3-12b-it";
const MAX_SIDE = 768;
const MIN_SIDE = 1;
const OK_STATUS = 200;
const MAX_TOKENS = 160;
const RETRY_TIMES = 2;
const RETRY_BASE = "500 millis";
const PROMPT =
  "この画像を検索で見つけられるよう、日本語で1〜2文で説明してください。写っている物や料理の名前、読める文字があればその内容を具体的に書いてください。説明だけを答えてください。";

class DescribeError extends Data.TaggedError("DescribeError")<{ readonly cause: unknown }> {}

type ImageSource = Readonly<{ proxyUrl: string; width: number; height: number }>;

const fitted = (side: number, scale: number): string =>
  `${Math.max(MIN_SIDE, Math.round(side * scale))}`;

const resizedUrl = ({ proxyUrl, width, height }: ImageSource): string => {
  const scale = Math.min(MIN_SIDE, MAX_SIDE / Math.max(width, height));
  const url = new URL(proxyUrl);
  url.searchParams.set("width", fitted(width, scale));
  url.searchParams.set("height", fitted(height, scale));
  url.searchParams.set("format", "jpeg");
  return url.toString();
};

const fetchImage = (
  source: ImageSource,
): Effect.Effect<string, DescribeError, HttpClient.HttpClient> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => client.get(resizedUrl(source))),
    Effect.filterOrFail(
      ({ status }) => status === OK_STATUS,
      ({ status }) => new DescribeError({ cause: `Image request failed with ${status}` }),
    ),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.map((buffer) => Base64.encode(new Uint8Array(buffer))),
    Effect.mapError((cause) => new DescribeError({ cause })),
  );

const runModel = (image: string): Effect.Effect<string, DescribeError> =>
  Effect.tryPromise({
    try: () =>
      env.AI.run(DESCRIBE_MODEL, {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } },
            ],
          },
        ],
        max_tokens: MAX_TOKENS,
      }),
    catch: (cause) => new DescribeError({ cause }),
  }).pipe(Effect.map(({ response }) => String.trim(response)));

const describeWithClient = (
  source: ImageSource,
): Effect.Effect<Option.Option<string>, never, HttpClient.HttpClient> =>
  fetchImage(source).pipe(
    Effect.flatMap(runModel),
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
    Effect.map(Option.liftPredicate(String.isNonEmpty)),
    Effect.catchTag("DescribeError", () =>
      Effect.logWarning("Could not describe an image").pipe(Effect.as(Option.none<string>())),
    ),
  );

const describeImage = (source: ImageSource): Effect.Effect<Option.Option<string>> =>
  Effect.scoped(
    Layer.build(FetchHttpClient.layer).pipe(
      Effect.flatMap((context) => describeWithClient(source).pipe(Effect.provideContext(context))),
    ),
  ).pipe(Effect.withSpan("describeImage"));

export { DESCRIBE_MODEL, describeImage };
export type { ImageSource };
