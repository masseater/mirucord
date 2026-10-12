import { env, waitUntil } from "cloudflare:workers";
import { Boolean, Effect, Option } from "effect";

const SIZE_BYTES = {
  "1k": 1024,
  "10k": 10_240,
  "100k": 102_400,
  "300k": 307_200,
  "1500k": 1_536_000,
} as const;
const OBJECTS_PER_SIZE = 50;
const NONE = 0;
const ONE = 1;
const BAD_REQUEST = 400;
const CACHE_NAME = "r2bench";
const CACHE_CONTROL = "public, max-age=3600";

const sizes: ReadonlyMap<string, number> = new Map(Object.entries(SIZE_BYTES));

type Read = Readonly<{ ms: number; bytes: number; hit: boolean }>;
type Batch = Readonly<{ wall: number; reads: readonly Read[] }>;
type Query = Readonly<{
  path: string;
  bucket: string;
  size: string;
  index: string;
  count: number;
  offset: number;
  cacheKeyBase: Option.Option<string>;
}>;
type Selection = Readonly<{ size: string; count: number }>;

const bucketFor = (label: string): R2Bucket =>
  Boolean.match(label === "apac", {
    onTrue: () => env.R2BENCH_APAC,
    onFalse: () => env.R2BENCH_ENAM,
  });

const elapsedSince = (started: number): number => performance.now() - started;

const PATTERN_PERIOD = 251;

const filler = (length: number): Uint8Array<ArrayBuffer> =>
  Uint8Array.from({ length }, (_slot, index) => index % PATTERN_PERIOD);

const objectKey = (size: string, index: number): string => `${size}/${index % OBJECTS_PER_SIZE}`;

const keysFor = (selection: Selection, offset: number): readonly string[] =>
  Array.from({ length: selection.count }, (_slot, index) =>
    objectKey(selection.size, offset + index),
  );

const putIfMissing = (label: string, key: string, bytes: number): Effect.Effect<number> =>
  Effect.promise(() => bucketFor(label).head(key)).pipe(
    Effect.flatMap((head) =>
      Option.match(Option.fromNullishOr(head), {
        onSome: () => Effect.succeed(NONE),
        onNone: () =>
          Effect.promise(() => bucketFor(label).put(key, filler(bytes))).pipe(Effect.as(ONE)),
      }),
    ),
  );

const seed = (query: Query, bytes: number): Effect.Effect<number> =>
  Effect.forEach(
    keysFor({ size: query.size, count: OBJECTS_PER_SIZE }, NONE),
    (key) => putIfMissing(query.bucket, key, bytes),
    { concurrency: "unbounded" },
  ).pipe(Effect.map((written) => written.reduce((sum, value) => sum + value, NONE)));

const fromBucket = (label: string, key: string): Effect.Effect<ArrayBuffer> =>
  Effect.promise(() => bucketFor(label).get(key)).pipe(
    Effect.flatMap((object) =>
      Option.match(Option.fromNullishOr(object), {
        onNone: () => Effect.succeed(new ArrayBuffer(NONE)),
        onSome: (found) => Effect.promise(() => found.arrayBuffer()),
      }),
    ),
  );

const store = (cacheKey: string, body: Readonly<ArrayBuffer>): Effect.Effect<void> =>
  Effect.promise(() => caches.open(CACHE_NAME)).pipe(
    Effect.flatMap((cache) =>
      Effect.promise(() =>
        cache.put(cacheKey, new Response(body, { headers: { "cache-control": CACHE_CONTROL } })),
      ),
    ),
  );

const storeLater = (cacheKey: string, body: Readonly<ArrayBuffer>): Effect.Effect<void> =>
  Effect.sync(() => {
    waitUntil(Effect.runPromise(store(cacheKey, body)));
  });

const lookup = (cacheKey: string): Effect.Effect<Option.Option<ArrayBuffer>> =>
  Effect.promise(() => caches.open(CACHE_NAME)).pipe(
    Effect.flatMap((cache) => Effect.promise(() => cache.match(cacheKey))),
    Effect.flatMap((cached) =>
      Option.match(Option.fromNullishOr(cached), {
        onNone: () => Effect.succeedNone,
        onSome: (response) => Effect.promise(() => response.arrayBuffer()).pipe(Effect.asSome),
      }),
    ),
  );

const viaCache = (label: string, key: string, cacheKey: string): Effect.Effect<Read> =>
  Effect.gen(function* cachedRead() {
    const started = performance.now();
    const cached = yield* lookup(cacheKey);
    const body = yield* Option.match(cached, {
      onSome: (hit) => Effect.succeed(hit),
      onNone: () => fromBucket(label, key),
    });
    const ms = elapsedSince(started);
    const hit = Option.isSome(cached);
    yield* Boolean.match(hit, {
      onTrue: () => Effect.void,
      onFalse: () => storeLater(cacheKey, body),
    });
    return { ms, bytes: body.byteLength, hit };
  });

const direct = (label: string, key: string): Effect.Effect<Read> =>
  Effect.gen(function* directRead() {
    const started = performance.now();
    const body = yield* fromBucket(label, key);
    return { ms: elapsedSince(started), bytes: body.byteLength, hit: false };
  });

const readOne = (query: Query, key: string): Effect.Effect<Read> =>
  Option.match(query.cacheKeyBase, {
    onSome: (base) => viaCache(query.bucket, key, `${base}/${query.bucket}/${key}`),
    onNone: () => direct(query.bucket, key),
  });

const readMany = (query: Query, selection: Selection): Effect.Effect<Batch> =>
  Effect.gen(function* batchRead() {
    const started = performance.now();
    const reads = yield* Effect.forEach(
      keysFor(selection, query.offset),
      (key) => readOne(query, key),
      { concurrency: "unbounded" },
    );
    return { wall: elapsedSince(started), reads };
  });

const twoHop = (query: Query): Effect.Effect<unknown> =>
  Effect.gen(function* twoHopRead() {
    const started = performance.now();
    const index = yield* readMany(query, { size: query.index, count: ONE });
    const bodies = yield* readMany(query, { size: query.size, count: query.count });
    return { wall: elapsedSince(started), index, bodies };
  });

type Route = (query: Query, bytes: number) => Effect.Effect<unknown>;

const routes: ReadonlyMap<string, Route> = new Map<string, Route>([
  ["/seed", seed],
  ["/read", (query: Query) => readMany(query, { size: query.size, count: query.count })],
  ["/twohop", twoHop],
]);

const intParam = (raw: string, fallback: number): number =>
  Math.max(Math.trunc(Number(raw)) || fallback, fallback);

const parse = (request: Request): Query => {
  const url = new URL(request.url);
  const param = (name: string): string => url.searchParams.get(name) ?? "";
  const nonce = param("cache");
  return {
    path: url.pathname,
    bucket: param("bucket"),
    size: param("size"),
    index: Boolean.match(param("index") === "", {
      onTrue: () => "10k",
      onFalse: () => param("index"),
    }),
    count: Math.min(intParam(param("n"), ONE), OBJECTS_PER_SIZE),
    offset: intParam(param("offset"), NONE),
    cacheKeyBase: Option.filter(Option.some(`${url.origin}/__cache/${nonce}`), () => nonce !== ""),
  };
};

const colo = (request: Request): string =>
  Option.fromUndefinedOr(request.cf).pipe(
    Option.map((cf) => String(cf.colo)),
    Option.getOrElse(() => ""),
  );

const handle = (request: Request): Effect.Effect<Response> => {
  const query = parse(request);
  const work = Option.all({
    run: Option.fromUndefinedOr(routes.get(query.path)),
    bytes: Option.fromUndefinedOr(sizes.get(query.size)),
    known: Option.liftPredicate(query.bucket, (label) => ["apac", "enam"].includes(label)),
  });
  return Option.match(work, {
    onNone: () => Effect.succeed(new Response("", { status: BAD_REQUEST })),
    onSome: ({ run, bytes }) =>
      run(query, bytes).pipe(
        Effect.map((result) =>
          Response.json(
            { colo: colo(request), result },
            { headers: { "cache-control": "no-store" } },
          ),
        ),
      ),
  });
};

const worker: ExportedHandler = {
  fetch: (request): Promise<Response> => Effect.runPromise(handle(request)),
};

export default worker;
