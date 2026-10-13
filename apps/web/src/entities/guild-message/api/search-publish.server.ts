import { Array, Effect, Option } from "effect";

import { SEQUENTIAL } from "#/entities/guild-message/lib/search-layout";

import { archiveStep } from "./search-archive.server";
import type { ArchiveStatus } from "./search-archive.server";
import { buildPiece, recordPieces } from "./search-build.server";
import type { Publisher } from "./search-build.server";
import { deletePrefix, deleteSegments, writeFiles } from "./search-files.server";
import { deletedEntry, writeSearchHead } from "./search-head.server";
import { EARLIEST, recentOf, sealedOf, segmentNames, searchLedger } from "./search-ledger.server";
import type { Segment } from "./search-ledger.server";
import { PURGE_AFTER_MS, searchPlanner } from "./search-plan.server";
import type { PieceRow, PieceSpec, Plan } from "./search-plan.server";
import { recentPlan } from "./search-recent.server";

type Replacement = Readonly<{
  kind: Segment["kind"];
  replaced: readonly Segment[];
  pieces: readonly PieceSpec[];
}>;

const replaceSegments = (
  publisher: Publisher,
  { kind, replaced, pieces }: Replacement,
): Effect.Effect<readonly Segment[]> => {
  const built = searchLedger(publisher.db).latestVersion();
  return Effect.forEach(pieces, (piece) => buildPiece({ publisher, kind, piece }), {
    concurrency: SEQUENTIAL,
  }).pipe(
    Effect.tap((placed) =>
      writeFiles({ bucket: publisher.bucket, files: placed.flatMap(({ files }) => files) }),
    ),
    Effect.map((placed) => {
      searchLedger(publisher.db).drop(replaced);
      recordPieces({ publisher, kind, pieces: placed, built });
      return replaced;
    }),
  );
};

const rebuildSealed = (publisher: Publisher, plan: Plan): Effect.Effect<readonly Segment[]> => {
  if (plan.status === "recentOnly") {
    return Effect.succeed([]);
  }
  return replaceSegments(publisher, {
    kind: "sealed",
    replaced: plan.replaced,
    pieces: plan.pieces,
  });
};

type RecentRebuild = Readonly<{ replaced: readonly Segment[]; rows: readonly PieceRow[] }>;

const replaceRecent = (
  publisher: Publisher,
  { replaced, rows }: RecentRebuild,
): Effect.Effect<readonly Segment[]> => {
  if (Array.isReadonlyArrayEmpty(rows)) {
    searchLedger(publisher.db).drop(replaced);
    return Effect.succeed(replaced);
  }
  const pieces = [{ range: { from: EARLIEST, to: Option.none<number>() }, rows }];
  return replaceSegments(publisher, { kind: "recent", replaced, pieces });
};

const rebuildRecent = (
  publisher: Publisher,
  sealedChanged: boolean,
): Effect.Effect<readonly Segment[]> => {
  const segments = searchLedger(publisher.db).segments();
  const recent = recentOf(segments);
  if (!recentPlan({ ...publisher, sealedChanged }).rebuild) {
    return Effect.succeed([]);
  }
  return replaceRecent(publisher, {
    replaced: Option.toArray(recent),
    rows: searchPlanner(publisher.db).recentRows(sealedOf(segments)),
  });
};

const laterRun = (publisher: Publisher): Option.Option<number> => {
  const sealed = segmentNames(sealedOf(searchLedger(publisher.db).segments()));
  const purge = Option.map(
    searchLedger(publisher.db).oldestInvalid(sealed),
    (since) => since + PURGE_AFTER_MS,
  );
  return Array.match(
    [
      ...Option.toArray(purge),
      ...Option.toArray(recentPlan({ ...publisher, sealedChanged: false }).waitUntil),
    ],
    {
      onEmpty: () => Option.none(),
      onNonEmpty: (times) => Option.some(Math.min(...times)),
    },
  );
};

const nextRun = (publisher: Publisher, archive: ArchiveStatus): Option.Option<number> => {
  const { db, now } = publisher;
  if (archive !== "idle" || searchPlanner(db).plan(now).status === "rebuild") {
    return Option.some(now);
  }
  return laterRun(publisher);
};

type Rebuilt = Readonly<{ replaced: readonly Segment[]; changed: boolean }>;

const rebuildAll = (publisher: Publisher): Effect.Effect<Rebuilt> => {
  const plan = searchPlanner(publisher.db).plan(publisher.now);
  const sealedChanged = plan.status === "rebuild";
  const recentChanged = recentPlan({ ...publisher, sealedChanged }).rebuild;
  const fresh =
    (sealedChanged || recentChanged) &&
    Array.isReadonlyArrayEmpty(searchLedger(publisher.db).segments());
  return Effect.when(deletePrefix(publisher), Effect.succeed(fresh)).pipe(
    Effect.andThen(rebuildSealed(publisher, plan)),
    Effect.flatMap((sealed) =>
      rebuildRecent(publisher, sealedChanged).pipe(
        Effect.map((recent) => ({
          replaced: [...sealed, ...recent],
          changed: sealedChanged || recentChanged,
        })),
      ),
    ),
  );
};

const publishSearch = (publisher: Publisher): Effect.Effect<Option.Option<number>> => {
  const { bucket, guildId } = publisher;
  const archiving = Effect.suspend(() =>
    archiveStep({
      ...publisher,
      mayStart: searchPlanner(publisher.db).plan(publisher.now).status !== "rebuild",
    }),
  );
  return Effect.all([rebuildAll(publisher), archiving], {
    concurrency: SEQUENTIAL,
  }).pipe(
    Effect.tap(([{ changed }, archive]) =>
      Effect.when(writeSearchHead(publisher), Effect.succeed(changed || archive === "finished")),
    ),
    Effect.tap(([{ replaced }]) =>
      deleteSegments({
        bucket,
        guildId,
        segments: replaced.map((segment) => deletedEntry(segment)),
      }),
    ),
    Effect.map(([, archive]) => nextRun(publisher, archive)),
    Effect.withSpan("search.publish", { attributes: { guildId } }),
  );
};

export { publishSearch };
