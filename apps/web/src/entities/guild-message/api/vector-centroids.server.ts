import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Option, pipe } from "effect";

import {
  blockOf,
  decodeBlock,
  encodeBlock,
  entriesOf,
} from "#/entities/guild-message/lib/vector-block";
import type { VectorEntry } from "#/entities/guild-message/lib/vector-block";
import {
  vectorCentroid,
  vectorCentroidFile,
} from "#/entities/guild-message/model/guild-message.schema";
import { openBytes, sealBytes } from "#/shared/crypto/index.server";

import { centroidsKey, deleteKeys, writeFiles } from "./search-files.server";
import { searchLedger } from "./search-ledger.server";
import type { Segment } from "./search-ledger.server";
import type { Keys } from "./vector-embed.server";

const FILE_ROW = 1;
const SINGLE_CLUSTER = 1;
const NEXT_STAMP = 1;
const NO_STAMP = 0;

type CentroidTarget = Readonly<{
  db: DrizzleSqliteDODatabase;
  keys: Keys;
  bucket: Readonly<R2Bucket>;
}>;

type SavedCentroids = CentroidTarget &
  Readonly<{
    segment: Segment;
    through: number;
    centroids: Option.Option<readonly VectorEntry[]>;
  }>;

type CentroidRow = typeof vectorCentroid.$inferSelect;

const centroidContext = ({ guildId }: Keys, segment: string): string =>
  `${guildId}/${segment}/centroids`;

const forgetCentroids = (db: DrizzleSqliteDODatabase, segment: string): void => {
  db.delete(vectorCentroid).where(eq(vectorCentroid.segment, segment)).run();
};

const insertCentroids = (
  db: DrizzleSqliteDODatabase,
  { segment, through, sealed }: CentroidRow,
): void => {
  db.insert(vectorCentroid)
    .values({ segment, through, sealed })
    .onConflictDoUpdate({ target: vectorCentroid.segment, set: { through, sealed } })
    .run();
};

const storeCentroids =
  ({ db, keys, segment, through }: SavedCentroids) =>
  (entries: readonly VectorEntry[]): Effect.Effect<void> =>
    encodeBlock(blockOf(entries)).pipe(
      Effect.flatMap((bytes) =>
        sealBytes({ bytes, key: keys.key, context: centroidContext(keys, segment.name) }),
      ),
      Effect.flatMap((sealed) =>
        Effect.sync(() => {
          insertCentroids(db, { segment: segment.name, through, sealed });
        }),
      ),
    );

const keepCentroids = (saved: SavedCentroids): Effect.Effect<void> =>
  Option.match(saved.centroids, {
    onNone: () =>
      Effect.sync(() => {
        forgetCentroids(saved.db, saved.segment.name);
      }),
    onSome: storeCentroids(saved),
  });

const centroidStamp = (db: DrizzleSqliteDODatabase): Option.Option<number> => {
  const row = db.select().from(vectorCentroidFile).where(eq(vectorCentroidFile.id, FILE_ROW)).get();
  return Option.map(Option.fromUndefinedOr(row), ({ stamp }) => stamp);
};

const clusteredThrough = (segment: Segment): Option.Option<number> =>
  Option.filter(
    Option.fromNullOr(segment.vectorThrough),
    () => (segment.vectorClusters ?? SINGLE_CLUSTER) > SINGLE_CLUSTER,
  );

const liveThrough = (db: DrizzleSqliteDODatabase): ReadonlyMap<string, number> =>
  new Map(
    pipe(
      searchLedger(db).segments(),
      Array.flatMap((segment) =>
        Option.toArray(
          Option.map(clusteredThrough(segment), (through) => [segment.name, through] as const),
        ),
      ),
    ),
  );

const openCentroids =
  (keys: Keys) =>
  ({ segment, sealed }: CentroidRow): Effect.Effect<readonly VectorEntry[]> =>
    openBytes({ bytes: sealed, key: keys.key, context: centroidContext(keys, segment) }).pipe(
      Effect.flatMap(decodeBlock),
      Effect.map((block) =>
        pipe(
          entriesOf(block),
          Array.map(({ ordinal, vector }) => ({ ordinal, channelId: segment, vector })),
        ),
      ),
    );

const mergedEntries = ({ db, keys }: CentroidTarget): Effect.Effect<readonly VectorEntry[]> => {
  const live = liveThrough(db);
  const rows = db.select().from(vectorCentroid).all();
  const isLive = ({ segment, through }: CentroidRow): boolean => live.get(segment) === through;
  for (const { segment } of pipe(
    rows,
    Array.filter((row) => !isLive(row)),
  )) {
    forgetCentroids(db, segment);
  }
  return pipe(
    rows,
    Array.filter((row) => isLive(row)),
    Effect.forEach((row) => openCentroids(keys)(row)),
    Effect.map((lists) => Array.flatten(lists)),
  );
};

const fileKeys = ({ keys }: CentroidTarget, stamp: Option.Option<number>): readonly string[] =>
  stamp.pipe(
    Option.map((last) => centroidsKey({ guildId: keys.guildId, stamp: last })),
    Option.toArray,
  );

const recordStamp = (db: DrizzleSqliteDODatabase, stamp: number): void => {
  db.insert(vectorCentroidFile)
    .values({ id: FILE_ROW, stamp })
    .onConflictDoUpdate({ target: vectorCentroidFile.id, set: { stamp } })
    .run();
};

const writeMerged = Effect.fnUntraced(function* writeMerged(
  target: CentroidTarget,
  entries: readonly VectorEntry[],
) {
  const previous = centroidStamp(target.db);
  const stamp = Option.getOrElse(previous, () => NO_STAMP) + NEXT_STAMP;
  const key = centroidsKey({ guildId: target.keys.guildId, stamp });
  const bytes = yield* encodeBlock(blockOf(entries));
  const sealed = yield* sealBytes({ bytes, key: target.keys.key, context: key });
  yield* writeFiles({
    bucket: target.bucket,
    files: [{ key, body: Uint8Array.from(sealed).buffer }],
  });
  recordStamp(target.db, stamp);
  yield* deleteKeys({ bucket: target.bucket, keys: fileKeys(target, previous) });
});

const dropMerged = (target: CentroidTarget): Effect.Effect<void> =>
  deleteKeys({ bucket: target.bucket, keys: fileKeys(target, centroidStamp(target.db)) }).pipe(
    Effect.andThen(
      Effect.sync(() => {
        target.db.delete(vectorCentroidFile).where(eq(vectorCentroidFile.id, FILE_ROW)).run();
      }),
    ),
  );

const publishCentroids = Effect.fn("vectors.publishCentroids")(function* publishCentroids(
  target: CentroidTarget,
) {
  const entries = yield* mergedEntries(target);
  yield* Effect.annotateCurrentSpan({ centroids: entries.length });
  if (Array.isReadonlyArrayNonEmpty(entries)) {
    yield* writeMerged(target, entries);
    return;
  }
  yield* dropMerged(target);
});

const saveCentroids = Effect.fnUntraced(function* saveCentroids(saved: SavedCentroids) {
  yield* keepCentroids(saved);
  if (saved.segment.kind !== "recent") {
    yield* publishCentroids(saved);
  }
});

export { centroidStamp, saveCentroids };
export type { CentroidTarget, SavedCentroids };
