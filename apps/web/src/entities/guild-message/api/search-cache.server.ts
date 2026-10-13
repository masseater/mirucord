import { env, waitUntil } from "cloudflare:workers";
import { Context, Effect, Option, Semaphore } from "effect";

import { SITE_ORIGIN } from "#/shared/config";

const CACHE_CONTROL = "public, max-age=86400, immutable";
const CACHE_NAME = "search-files";
const MATCH_TIMEOUT = "2 seconds";
const READ_PERMITS = 4;
const WRITE_PERMITS = 1;
const ONE = 1;

class FileGate extends Context.Service<
  FileGate,
  Readonly<{ reads: Semaphore.Semaphore; writes: Semaphore.Semaphore }>
>()("web/entities/guild-message/api/search-cache.server/FileGate") {}

const withFileGate = <Value, Failure, Needs>(
  effect: Effect.Effect<Value, Failure, Needs>,
): Effect.Effect<Value, Failure, Exclude<Needs, FileGate>> =>
  Effect.provideServiceEffect(
    effect,
    FileGate,
    Effect.all({ reads: Semaphore.make(READ_PERMITS), writes: Semaphore.make(WRITE_PERMITS) }),
  );

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

const remember = (
  key: string,
  bytes: Readonly<ArrayBuffer>,
): Effect.Effect<void, never, FileGate> =>
  Effect.service(FileGate).pipe(
    Effect.flatMap(({ writes }) =>
      Effect.sync(() => {
        const writing = writes.withPermits(ONE)(putInCache(key, bytes));
        waitUntil(Effect.runPromise(writing));
      }),
    ),
  );

type FileRead = Readonly<{ key: string; bytes: Option.Option<ArrayBuffer>; cached: boolean }>;

const fromBucket = (key: string): Effect.Effect<FileRead, never, FileGate> =>
  objectBytes(key).pipe(
    Effect.tap(
      Option.match({ onNone: () => Effect.void, onSome: (bytes) => remember(key, bytes) }),
    ),
    Effect.map((bytes): FileRead => ({ key, bytes, cached: false })),
  );

const lateBody = (pending: () => Promise<Response | undefined>): Effect.Effect<void> =>
  Effect.promise(pending).pipe(
    Effect.map((late) =>
      Option.flatMap(Option.fromUndefinedOr(late), ({ body }) => Option.fromNullOr(body)),
    ),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (body) => Effect.promise(() => body.cancel()),
      }),
    ),
  );

const matchOnce = (
  cache: Readonly<Cache>,
  key: string,
): Effect.Effect<Option.Option<ArrayBuffer>, never, FileGate> =>
  Effect.service(FileGate).pipe(
    Effect.flatMap(({ reads }) => {
      const matching = Effect.promise((signal) => {
        const pending = cache.match(cacheUrl(key));
        signal.addEventListener("abort", () => {
          const settled = lateBody(() => pending).pipe(Effect.ensuring(reads.release(ONE)));
          waitUntil(Effect.runPromise(settled));
        });
        return pending;
      }).pipe(Effect.timeoutOption(MATCH_TIMEOUT));
      return reads.take(ONE).pipe(
        Effect.andThen(matching),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeedNone,
            onSome: (found) =>
              Option.match(Option.fromUndefinedOr(found), {
                onNone: () => Effect.succeedNone,
                onSome: (response) =>
                  Effect.promise(() => response.arrayBuffer()).pipe(Effect.asSome),
              }).pipe(Effect.ensuring(reads.release(ONE))),
          }),
        ),
      );
    }),
  );

const cachedBytes = (key: string): Effect.Effect<FileRead, never, FileGate> =>
  Effect.all([Effect.service(FileGate), searchCache]).pipe(
    Effect.flatMap(([{ reads }, cache]) =>
      matchOnce(cache, key).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => reads.withPermits(ONE)(fromBucket(key)),
            onSome: (bytes) =>
              Effect.succeed<FileRead>({ key, bytes: Option.some(bytes), cached: true }),
          }),
        ),
      ),
    ),
  );

export { cachedBytes, withFileGate };
export type { FileGate, FileRead };
