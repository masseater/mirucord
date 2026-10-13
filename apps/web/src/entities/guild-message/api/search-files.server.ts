import { env } from "cloudflare:workers";
import { Array, Effect, Option, Schema } from "effect";

import { chunkCountOf } from "#/entities/guild-message/lib/search-segment";

const WRITE_CONCURRENCY = 16;
const DELETE_BATCH = 1000;

const SegmentVectorsSchema = Schema.Struct({ through: Schema.Int, clusters: Schema.Int });

const SegmentEntrySchema = Schema.Struct({
  name: Schema.String,
  kind: Schema.Literals(["sealed", "recent"]),
  from: Schema.Finite,
  archived: Schema.Boolean,
  count: Schema.Int,
  shards: Schema.Int,
  vectors: Schema.optionalKey(SegmentVectorsSchema),
});

const ArchiveEntrySchema = Schema.Struct({
  name: Schema.String,
  shards: Schema.Int,
  pieces: Schema.Array(Schema.Struct({ name: Schema.String, offset: Schema.Int })),
});

type ArchiveEntry = typeof ArchiveEntrySchema.Type;

type SegmentVectors = typeof SegmentVectorsSchema.Type;

type SegmentEntry = typeof SegmentEntrySchema.Type;

const SearchHeadSchema = Schema.Struct({
  segments: Schema.Array(SegmentEntrySchema),
  channels: Schema.Array(Schema.String),
  archive: Schema.optionalKey(ArchiveEntrySchema),
  invalid: Schema.Record(Schema.String, Schema.Array(Schema.Int)),
});

type SearchHead = typeof SearchHeadSchema.Type;

const SearchHeadJson = Schema.fromJsonString(SearchHeadSchema);
const decodeHead = Schema.decodeEffect(SearchHeadJson);
const encodeHead = Schema.encodeEffect(SearchHeadJson);

type SegmentFile = Readonly<{ guildId: string; segment: string }>;

const headKey = (guildId: string): string => `${guildId}/head`;
const recentKey = ({ guildId, segment }: SegmentFile): string => `${guildId}/${segment}/x`;
const shardKey = ({ guildId, segment, shard }: SegmentFile & Readonly<{ shard: number }>): string =>
  `${guildId}/${segment}/i${shard}`;
const archiveKey = ({
  guildId,
  archive,
  shard,
}: Readonly<{ guildId: string; archive: string; shard: number }>): string =>
  `${guildId}/${archive}/a${shard}`;
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

const vectorsOfRow = ({
  vectorThrough,
  vectorClusters,
}: Readonly<{
  name: string;
  vectorThrough: number | null;
  vectorClusters: number | null;
}>): Option.Option<SegmentVectors> =>
  Option.all({
    through: Option.fromNullOr(vectorThrough),
    clusters: Option.fromNullOr(vectorClusters),
  });

const vectorKeys = ({
  guildId,
  row,
}: Readonly<{
  guildId: string;
  row: Readonly<{
    name: string;
    vectorThrough: number | null;
    vectorClusters: number | null;
  }>;
}>): readonly string[] =>
  Option.match(vectorsOfRow(row), {
    onNone: () => [],
    onSome: (vectors) => keysOfVectors(guildId, row.name, vectors),
  });

const indexKeys = (
  guildId: string,
  { name, kind, shards }: Pick<SegmentEntry, "name" | "kind" | "shards">,
): readonly string[] => {
  if (kind === "recent") {
    return [recentKey({ guildId, segment: name })];
  }
  return Array.makeBy(shards, (shard) => shardKey({ guildId, segment: name, shard }));
};

const segmentKeys = (guildId: string, entry: SegmentEntry): readonly string[] => [
  ...Option.match(Option.fromUndefinedOr(entry.vectors), {
    onNone: () => [],
    onSome: (found) => keysOfVectors(guildId, entry.name, found),
  }),
  ...indexKeys(guildId, entry),
  ...Array.makeBy(chunkCountOf(entry.count), (chunk) =>
    chunkKey({ guildId, segment: entry.name, chunk }),
  ),
];

const EMPTY_HEAD: SearchHead = { segments: [], channels: [], invalid: {} };

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
  archiveKey,
  centroidsKey,
  chunkKey,
  clusterKey,
  deleteKeys,
  deletePrefix,
  deleteSegments,
  recentKey,
  readHead,
  shardKey,
  vectorFileKey,
  vectorKeys,
  vectorsOfRow,
  writeFiles,
  writeHead,
};
export type {
  ArchiveEntry,
  Bucketed,
  SearchHead,
  SegmentEntry,
  SegmentFile,
  SegmentVectors,
  StoredFile,
};
