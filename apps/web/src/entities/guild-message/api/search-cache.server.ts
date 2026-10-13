import { env, waitUntil } from "cloudflare:workers";
import { Effect, Option } from "effect";

import { SITE_ORIGIN } from "#/shared/config";

const CACHE_CONTROL = "public, max-age=86400, immutable";
const CACHE_NAME = "search-files";
const MATCH_TIMEOUT = "2 seconds";

const cacheUrl = (key: string): string => `${SITE_ORIGIN}/search-files/${key}`;

const searchCache = Effect.promise(() => caches.open(CACHE_NAME));

const objectBytes = (key: string): Effect.Effect<Option.Option<ArrayBuffer>> =>
  Effect.promise(() => env.SEARCH.get(key)).pipe(
    Effect.map(Option.fromNullOr),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (object) => Effect.promise(() => object.arrayBuffer()).pipe(Effect.asSome),
      }),
    ),
    Effect.withSpan("search.r2Get", { attributes: { key } }),
  );

const putInCache = (key: string, bytes: Readonly<ArrayBuffer>): Effect.Effect<void> =>
  searchCache.pipe(
    Effect.flatMap((cache) =>
      Effect.promise(() =>
        cache.put(
          cacheUrl(key),
          new Response(bytes, { headers: { "cache-control": CACHE_CONTROL } }),
        ),
      ),
    ),
  );

const remember = (key: string, bytes: Readonly<ArrayBuffer>): Effect.Effect<void> =>
  Effect.sync(() => {
    waitUntil(Effect.runPromise(putInCache(key, bytes)));
  });

type FileRead = Readonly<{ key: string; bytes: Option.Option<ArrayBuffer>; cached: boolean }>;

const fromBucket = (key: string): Effect.Effect<FileRead> =>
  objectBytes(key).pipe(
    Effect.tap(
      Option.match({ onNone: () => Effect.void, onSome: (bytes) => remember(key, bytes) }),
    ),
    Effect.map((bytes): FileRead => ({ key, bytes, cached: false })),
  );

const cachedBytes = (key: string): Effect.Effect<FileRead> =>
  searchCache.pipe(
    Effect.flatMap((cache) =>
      Effect.promise(() => cache.match(cacheUrl(key))).pipe(
        Effect.timeoutOption(MATCH_TIMEOUT),
        Effect.map(Option.flatMap(Option.fromNullishOr)),
      ),
    ),
    Effect.flatMap(
      Option.match({
        onNone: () => fromBucket(key),
        onSome: (response) =>
          Effect.promise(() => response.arrayBuffer()).pipe(
            Effect.map((bytes): FileRead => ({ key, bytes: Option.some(bytes), cached: true })),
          ),
      }),
    ),
  );

export { cachedBytes };
export type { FileRead };
