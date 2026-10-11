import { env } from "cloudflare:workers";
import { Array, Boolean, Data, Effect, Layer, Option, Schedule, String } from "effect";
import { Base64 } from "effect/encoding";
import { FetchHttpClient, HttpClient } from "effect/http";

import { SITE_ORIGIN } from "#/shared/config";

const DESCRIBE_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const MAX_SIDE = 768;
const MIN_SIDE = 1;
const OK_STATUS = 200;
const MAX_TOKENS = 160;
const RETRY_TIMES = 2;
const RETRY_BASE = "500 millis";
const USER_AGENT = `DiscordBot (${SITE_ORIGIN}, 1.0)`;
const MAX_ORIGINAL_BYTES = 4_000_000;
const ORIGINAL_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "image/webp"]);
const DIAGNOSTIC_HEADERS = ["server", "cf-mitigated", "content-type"];
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

type ImageSource = Readonly<{
  proxyUrl: string;
  originalUrl: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
}>;

type FetchedImage = Readonly<{ data: string; contentType: string }>;

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

const diagnosticsOf = (headers: Readonly<Record<string, string>>): string =>
  DIAGNOSTIC_HEADERS.map(
    (name) => `${name}=${Option.getOrElse(Option.fromUndefinedOr(headers[name]), () => "-")}`,
  ).join(" ");

const fetchFrom = (
  url: string,
  contentType: string,
): Effect.Effect<FetchedImage, DescribeError, HttpClient.HttpClient> =>
  HttpClient.HttpClient.pipe(
    Effect.flatMap((client) => client.get(url, { headers: { "user-agent": USER_AGENT } })),
    Effect.filterOrFail(
      ({ status }) => status === OK_STATUS,
      ({ status, headers }) =>
        new DescribeError({
          stage: "fetch",
          reason: `${new URL(url).host} status ${status} ${diagnosticsOf(headers)}`,
        }),
    ),
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.map((buffer) => ({ data: Base64.encode(new Uint8Array(buffer)), contentType })),
    Effect.catchTag(["HttpClientError"], (cause) =>
      Effect.fail(new DescribeError({ stage: "fetch", reason: cause.reason.name })),
    ),
  );

const fetchOriginal = (
  { originalUrl, contentType, size }: ImageSource,
  proxyReason: string,
): Effect.Effect<FetchedImage, DescribeError, HttpClient.HttpClient> =>
  Boolean.match(ORIGINAL_TYPES.has(contentType) && size <= MAX_ORIGINAL_BYTES, {
    onFalse: () => Effect.fail(new DescribeError({ stage: "fetch", reason: proxyReason })),
    onTrue: () =>
      fetchFrom(originalUrl, contentType).pipe(
        Effect.mapError(
          ({ reason }) =>
            new DescribeError({ stage: "fetch", reason: `${proxyReason}; ${reason}` }),
        ),
      ),
  });

const fetchImage = (
  source: ImageSource,
): Effect.Effect<FetchedImage, DescribeError, HttpClient.HttpClient> =>
  fetchFrom(resizedUrl(source), "image/jpeg").pipe(
    Effect.catchTag("DescribeError", ({ reason }) => fetchOriginal(source, reason)),
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

export { DESCRIBE_MODEL, describeImage };
export type { ImageSource };
