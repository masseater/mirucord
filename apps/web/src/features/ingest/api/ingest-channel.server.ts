import { and, eq, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array, Boolean, DateTime, Effect, Number, Option } from "effect";

import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { openGuildKeys } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";
import { FORBIDDEN } from "#/shared/discord/index.server";
import type { DiscordMessage } from "#/shared/discord/index.server";

import { columnsOf } from "./bot-access.server";
import { enqueue } from "./enqueue.server";
import {
  fetchAndStore,
  idsOf,
  isFullPage,
  isNewerThan,
  newestId,
  oldestId,
} from "./message-page.server";
import type { IngestError, StoreTarget } from "./message-page.server";
import { removeDeleted, sweepHistory } from "./sweep-history.server";

const MAX_PAGES_PER_RUN = 5;
const LAST_PAGE = 1;

type Backfill = "pending" | "done";

type History = Readonly<{ oldest: Option.Option<string>; backfill: Backfill }>;

type Cursor = Readonly<{ cursor: string; remaining: number }>;

type ChannelProgress = Readonly<{
  wrappedKey: string;
  newest: string | null;
  oldest: string | null;
  backfill: Backfill;
  sweep: string | null;
}>;

const backfillAfter = (page: readonly DiscordMessage[]): Backfill =>
  Boolean.match(isFullPage(page), { onTrue: () => "pending", onFalse: () => "done" });

const loadProgress = (job: IngestJob): Effect.Effect<Option.Option<ChannelProgress>> =>
  Effect.promise(() =>
    db
      .select({
        wrappedKey: guild.wrappedKey,
        newest: channel.newestMessageId,
        oldest: channel.oldestMessageId,
        backfill: channel.backfill,
        sweep: channel.sweepCursor,
      })
      .from(channel)
      .innerJoin(guild, eq(channel.guildId, guild.id))
      .innerJoin(ingestConsent, eq(ingestConsent.guildId, guild.id))
      .where(
        and(
          eq(channel.id, job.channelId),
          eq(channel.guildId, job.guildId),
          eq(channel.botAccess, "readable"),
        ),
      ),
  ).pipe(Effect.map(Array.head));

const pageForward = (
  target: StoreTarget,
  stopAt: string,
  { cursor, remaining }: Cursor,
): Effect.Effect<Option.Option<string>, IngestError> =>
  fetchAndStore({ target, request: { direction: "after", cursor } }).pipe(
    Effect.flatMap((page) => {
      const next = Option.getOrElse(newestId(idsOf(page)), () => cursor);
      if (!isFullPage(page) || !isNewerThan(stopAt, next)) {
        return Effect.succeedNone;
      }
      if (remaining <= LAST_PAGE) {
        return Effect.succeedSome(next);
      }
      return pageForward(target, stopAt, { cursor: next, remaining: Number.decrement(remaining) });
    }),
  );

const catchUp = (
  target: StoreTarget,
  frontier: string,
  latest: readonly DiscordMessage[],
): Effect.Effect<string, IngestError> => {
  const closed = Option.getOrElse(newestId(idsOf(latest)), () => frontier);
  const gapStart = oldestId(idsOf(latest)).pipe(
    Option.filter((oldest) => isFullPage(latest) && isNewerThan(oldest, frontier)),
  );
  return Option.match(gapStart, {
    onNone: () => Effect.succeed(closed),
    onSome: (stopAt) =>
      pageForward(target, stopAt, { cursor: frontier, remaining: MAX_PAGES_PER_RUN }).pipe(
        Effect.map(Option.getOrElse(() => closed)),
      ),
  });
};

const pageBackward = (
  target: StoreTarget,
  { cursor, remaining }: Cursor,
): Effect.Effect<History, IngestError> =>
  fetchAndStore({ target, request: { direction: "before", cursor } }).pipe(
    Effect.flatMap((page) => {
      const history = {
        oldest: Option.orElse(oldestId(idsOf(page)), () => Option.some(cursor)),
        backfill: backfillAfter(page),
      };
      if (history.backfill === "done" || remaining <= LAST_PAGE) {
        return Effect.succeed(history);
      }
      return pageBackward(target, {
        cursor: Option.getOrElse(history.oldest, () => cursor),
        remaining: Number.decrement(remaining),
      });
    }),
  );

const advanceNewest = (
  target: StoreTarget,
  progress: ChannelProgress,
  latest: readonly DiscordMessage[],
): Effect.Effect<Option.Option<string>, IngestError> =>
  Option.match(Option.fromNullOr(progress.newest), {
    onNone: () => Effect.succeed(newestId(idsOf(latest))),
    onSome: (frontier) => Effect.asSome(catchUp(target, frontier, latest)),
  });

const advanceOldest = (
  target: StoreTarget,
  progress: ChannelProgress,
  latest: readonly DiscordMessage[],
): Effect.Effect<History, IngestError> => {
  const oldest = Option.fromNullOr(progress.oldest);
  if (progress.backfill === "done") {
    return Effect.succeed({ oldest, backfill: "done" });
  }
  return Option.match(oldest, {
    onNone: () =>
      Effect.succeed({ oldest: oldestId(idsOf(latest)), backfill: backfillAfter(latest) }),
    onSome: (cursor) => pageBackward(target, { cursor, remaining: MAX_PAGES_PER_RUN }),
  });
};

type Progress = Readonly<{
  newest: Option.Option<string>;
  history: History;
  sweep: Option.Option<string>;
}>;

type Saved = "saved" | "superseded";

const sameOldest = (oldest: string | null): SQL =>
  Option.match(Option.fromNullOr(oldest), {
    onNone: () => isNull(channel.oldestMessageId),
    onSome: (id) => eq(channel.oldestMessageId, id),
  });

const saveProgress = (
  job: IngestJob,
  previous: ChannelProgress,
  { newest, history, sweep }: Progress,
): Effect.Effect<Saved> =>
  Effect.promise(() =>
    db
      .update(channel)
      .set({
        newestMessageId: Option.getOrNull(newest),
        oldestMessageId: Option.getOrNull(history.oldest),
        backfill: history.backfill,
        sweepCursor: Option.getOrNull(sweep),
      })
      .where(and(eq(channel.id, job.channelId), sameOldest(previous.oldest)))
      .returning({ id: channel.id }),
  ).pipe(
    Effect.map((rows): Saved => {
      if (Array.isReadonlyArrayEmpty(rows)) {
        return "superseded";
      }
      return "saved";
    }),
  );

const continueBackfill = (job: IngestJob, history: History): Effect.Effect<void> => {
  if (history.backfill === "done") {
    return Effect.void;
  }
  return Option.match(history.oldest, {
    onNone: () => Effect.void,
    onSome: (resumeBefore) =>
      enqueue([{ guildId: job.guildId, channelId: job.channelId, resumeBefore }]).pipe(
        Effect.andThen(Effect.logInfo("Backfill continues")),
        Effect.annotateLogs({ guildId: job.guildId, channelId: job.channelId, resumeBefore }),
      ),
  });
};

const ingestWith = (job: IngestJob, progress: ChannelProgress): Effect.Effect<void, IngestError> =>
  Effect.gen(function* ingest() {
    const target = { ...(yield* openGuildKeys(progress.wrappedKey)), job };
    const latest = yield* fetchAndStore({ target, request: { direction: "latest" } });
    yield* removeDeleted({ ref: job, latest });
    const newest = yield* advanceNewest(target, progress, latest);
    const history = yield* advanceOldest(target, progress, latest);
    const sweep = yield* sweepHistory({ target, sweep: Option.fromNullOr(progress.sweep), latest });
    const saved = yield* saveProgress(job, progress, { newest, history, sweep });
    if (saved === "saved") {
      yield* continueBackfill(job, history);
    }
  });

const isSuperseded = (job: IngestJob, progress: ChannelProgress): boolean =>
  Option.fromUndefinedOr(job.resumeBefore).pipe(
    Option.exists(
      (resumeBefore) => progress.backfill === "done" || progress.oldest !== resumeBefore,
    ),
  );

const pauseHidden = (job: IngestJob): Effect.Effect<void> =>
  DateTime.now.pipe(
    Effect.flatMap((now) =>
      Effect.promise(() =>
        db
          .update(channel)
          .set(columnsOf({ status: "hidden", since: now }))
          .where(and(eq(channel.id, job.channelId), eq(channel.botAccess, "readable"))),
      ),
    ),
    Effect.andThen(Effect.logWarning("Bot lost access to a channel; ingest paused")),
    Effect.annotateLogs({ guildId: job.guildId, channelId: job.channelId }),
  );

const loadChannelKey = (job: IngestJob): Effect.Effect<Option.Option<string>> =>
  loadProgress(job).pipe(Effect.map(Option.map(({ wrappedKey }) => wrappedKey)));

const ingestChannel = (job: IngestJob): Effect.Effect<void, IngestError> =>
  loadProgress(job).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (progress) => {
          if (isSuperseded(job, progress)) {
            return Effect.void;
          }
          return ingestWith(job, progress);
        },
      }),
    ),
    Effect.catchTag("DiscordRequestError", (failure) => {
      if (Option.contains(failure.status, FORBIDDEN)) {
        return pauseHidden(job);
      }
      return Effect.fail(failure);
    }),
  );

export { ingestChannel, loadChannelKey };
