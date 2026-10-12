import { env, waitUntil } from "cloudflare:workers";
import { Array, Effect, Option, Schema } from "effect";

import { chunkCountOf } from "#/entities/guild-message/lib/search-segment";
import { SITE_ORIGIN } from "#/shared/config";

const CACHE_CONTROL = "public, max-age=86400, immutable";
const CACHE_NAME = "search-files";
const WRITE_CONCURRENCY = 16;
const DELETE_BATCH = 1000;

const SegmentVectorsSchema = Schema.Struct({ through: Schema.Int, clusters: Schema.Int });

const SegmentEntrySchema = Schema.Struct({
  name: Schema.String,
  count: Schema.Int,
  shards: Schema.Int,
  vectors: Schema.optionalKey(SegmentVectorsSchema),
});

type SegmentVectors = typeof SegmentVectorsSchema.Type;

type SegmentEntry = typeof SegmentEntrySchema.Type;

const SearchHeadSchema = Schema.Struct({
  segments: Schema.Array(SegmentEntrySchema),
  invalid: Schema.Record(Schema.String, Schema.Array(Schema.Int)),
});

type SearchHead = typeof SearchHeadSchema.Type;

const SearchHeadJson = Schema.fromJsonString(SearchHeadSchema);
const decodeHead = Schema.decodeEffect(SearchHeadJson);
const encodeHead = Schema.encodeEffect(SearchHeadJson);

type SegmentFile = Readonly<{ guildId: string; segment: string }>;

const headKey = (guildId: string): string => `${guildId}/head`;
const metaKey = ({ guildId, segment }: SegmentFile): string => `${guildId}/${segment}/meta`;
const shardKey = ({ guildId, segment, shard }: SegmentFile & Readonly<{ shard: number }>): string =>
  `${guildId}/${segment}/i${shard}`;
const chunkKey = ({ guildId, segment, chunk }: SegmentFile & Readonly<{ chunk: number }>): string =>
  `${guildId}/${segment}/b${chunk}`;

const CENTROIDS = "c";

const vectorFileKey = ({
  guildId,
  segment,
  file,
}: SegmentFile & Readonly<{ file: string }>): string => `${guildId}/${segment}/${file}`;

const centroidsKey = ({
  guildId,
  segment,
  through,
}: SegmentFile & Readonly<{ through: number }>): string =>
  vectorFileKey({ guildId, segment, file: `v${through}${CENTROIDS}` });

const clusterKey = ({
  guildId,
  segment,
  through,
  cluster,
}: SegmentFile & Readonly<{ through: number; cluster: number }>): string =>
  vectorFileKey({ guildId, segment, file: `v${through}-${cluster}` });

const SINGLE_CLUSTER = 1;

const keysOfVectors = (
  guildId: string,
  segment: string,
  { through, clusters }: SegmentVectors,
): readonly string[] => [
  ...Array.makeBy(clusters, (cluster) => clusterKey({ guildId, segment, through, cluster })),
  ...Array.filter([centroidsKey({ guildId, segment, through })], () => clusters > SINGLE_CLUSTER),
];

type VectorColumns = Readonly<{
  name: string;
  vectorThrough: number | null;
  vectorClusters: number | null;
}>;

const vectorsOfRow = ({
  vectorThrough,
  vectorClusters,
}: VectorColumns): Option.Option<SegmentVectors> =>
  Option.all({
    through: Option.fromNullOr(vectorThrough),
    clusters: Option.fromNullOr(vectorClusters),
  });

const vectorKeys = ({
  guildId,
  row,
}: Readonly<{ guildId: string; row: VectorColumns }>): readonly string[] =>
  Option.match(vectorsOfRow(row), {
    onNone: () => [],
    onSome: (vectors) => keysOfVectors(guildId, row.name, vectors),
  });

const segmentKeys = (
  guildId: string,
  { name, count, shards, vectors }: SegmentEntry,
): readonly string[] => [
  ...Option.match(Option.fromUndefinedOr(vectors), {
    onNone: () => [],
    onSome: (found) => keysOfVectors(guildId, name, found),
  }),
  metaKey({ guildId, segment: name }),
  ...Array.makeBy(shards, (shard) => shardKey({ guildId, segment: name, shard })),
  ...Array.makeBy(chunkCountOf(count), (chunk) => chunkKey({ guildId, segment: name, chunk })),
];

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
    Effect.flatMap((cache) => Effect.promise(() => cache.match(cacheUrl(key)))),
    Effect.map(Option.fromNullishOr),
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

const EMPTY_HEAD: SearchHead = { segments: [], invalid: {} };

const readHead = (guildId: string): Effect.Effect<SearchHead> =>
  Effect.promise(() => env.SEARCH.get(headKey(guildId))).pipe(
    Effect.map(Option.fromNullOr),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(EMPTY_HEAD),
        onSome: (object) =>
          Effect.promise(() => object.text()).pipe(Effect.flatMap(decodeHead), Effect.orDie),
      }),
    ),
    Effect.withSpan("search.readHead"),
  );

type Bucketed = Readonly<{ bucket: Readonly<R2Bucket>; guildId: string }>;

const writeHead = ({
  bucket,
  guildId,
  head,
}: Bucketed & Readonly<{ head: SearchHead }>): Effect.Effect<void> =>
  encodeHead(head).pipe(
    Effect.orDie,
    Effect.flatMap((json) => Effect.promise(() => bucket.put(headKey(guildId), json))),
    Effect.asVoid,
  );

type StoredFile = Readonly<{ key: string; body: Readonly<ArrayBuffer> | string }>;

const writeFiles = ({
  bucket,
  files,
}: Readonly<{ bucket: Readonly<R2Bucket>; files: readonly StoredFile[] }>): Effect.Effect<void> =>
  Effect.forEach(files, ({ key, body }) => Effect.promise(() => bucket.put(key, body)), {
    concurrency: WRITE_CONCURRENCY,
    discard: true,
  }).pipe(Effect.withSpan("search.writeFiles", { attributes: { files: files.length } }));

const deleteKeys = ({
  bucket,
  keys,
}: Readonly<{ bucket: Readonly<R2Bucket>; keys: readonly string[] }>): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(keys, DELETE_BATCH),
    (batch) => Effect.promise(() => bucket.delete([...batch])),
    { discard: true },
  );

const sweepFrom = (
  { bucket, guildId }: Bucketed,
  cursor: Option.Option<string>,
): Effect.Effect<void> =>
  Effect.promise(() =>
    bucket.list({
      prefix: `${guildId}/`,
      ...Option.match(cursor, { onNone: () => ({}), onSome: (from) => ({ cursor: from }) }),
    }),
  ).pipe(
    Effect.tap((listed) => deleteKeys({ bucket, keys: listed.objects.map(({ key }) => key) })),
    Effect.flatMap((listed) =>
      Option.match(
        Option.liftPredicate(listed, (page) => page.truncated),
        {
          onNone: () => Effect.void,
          onSome: (page) => sweepFrom({ bucket, guildId }, Option.some(page.cursor)),
        },
      ),
    ),
  );

const deletePrefix = (target: Bucketed): Effect.Effect<void> => sweepFrom(target, Option.none());

const deleteSegments = ({
  bucket,
  guildId,
  segments,
}: Bucketed & Readonly<{ segments: readonly SegmentEntry[] }>): Effect.Effect<void> =>
  deleteKeys({ bucket, keys: segments.flatMap((segment) => segmentKeys(guildId, segment)) });

export {
  cachedBytes,
  centroidsKey,
  chunkKey,
  clusterKey,
  deleteKeys,
  deletePrefix,
  deleteSegments,
  metaKey,
  readHead,
  shardKey,
  vectorFileKey,
  vectorKeys,
  vectorsOfRow,
  writeFiles,
  writeHead,
};
export type {
  Bucketed,
  FileRead,
  SearchHead,
  SegmentEntry,
  SegmentFile,
  SegmentVectors,
  StoredFile,
};
