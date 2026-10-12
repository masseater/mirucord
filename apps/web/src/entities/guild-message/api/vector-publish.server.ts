import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Option } from "effect";

import { groupEntries } from "#/entities/guild-message/lib/clusters";

import { deleteKeys, vectorKeys, writeFiles } from "./search-files.server";
import type { Segment } from "./search-ledger.server";
import { writeSearchHead } from "./search-publish.server";
import type { Keys } from "./vector-embed.server";
import { openEntries, sealFiles } from "./vector-files.server";
import { vectorLedger } from "./vector-ledger.server";

const ONE_SEGMENT = 1;

type VectorPublisher = Readonly<{
  db: DrizzleSqliteDODatabase;
  bucket: Readonly<R2Bucket>;
  keys: Keys;
}>;

type Outcome = Readonly<{ status: "idle" | "more" }>;

const rebuildSegment = Effect.fn("vectors.rebuildSegment")(function* rebuildSegment(
  { db, bucket, keys }: VectorPublisher,
  segment: Segment,
) {
  const ledger = vectorLedger(db);
  const through = ledger.latestVectorAt();
  const entries = yield* openEntries({
    keys,
    segment,
    stored: ledger.storedVectors(segment.ids),
  });
  const grouped = groupEntries({ flat: segment.kind === "recent", entries });
  const files = yield* sealFiles({ keys, segment, through, grouped });
  yield* writeFiles({ bucket, files });
  ledger.markPublished({ segment, through, clusters: grouped.clusters.length });
  yield* writeSearchHead({ db, bucket, guildId: keys.guildId });
  yield* deleteKeys({ bucket, keys: vectorKeys({ guildId: keys.guildId, row: segment }) });
  yield* Effect.annotateCurrentSpan({
    segment: segment.name,
    vectors: entries.length,
    clusters: grouped.clusters.length,
  });
});

const publishVectors = Effect.fn("vectors.publish")(function* publishVectors(
  publisher: VectorPublisher,
) {
  const stale = vectorLedger(publisher.db).staleSegments();
  const next = Array.head(stale);
  if (Option.isNone(next)) {
    return { status: "idle" } satisfies Outcome;
  }
  yield* rebuildSegment(publisher, next.value);
  if (stale.length > ONE_SEGMENT) {
    return { status: "more" } satisfies Outcome;
  }
  return { status: "idle" } satisfies Outcome;
});

export { publishVectors };
export type { VectorPublisher };
