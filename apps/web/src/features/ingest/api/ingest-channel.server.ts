import { and, eq } from "drizzle-orm";
import { Array, Boolean, DateTime, Effect, Number, Option, pipe } from "effect";

import { isNewerThan, newestId, oldestId } from "#/features/ingest/lib/snowflake";
import type { IngestJob } from "#/features/ingest/model/ingest-job";
import { openGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild } from "#/shared/db/index.server";
import { listMessages, PAGE_SIZE } from "#/shared/discord/index.server";
import type {
  DiscordMessage,
  DiscordRequestError,
  MessagePage,
} from "#/shared/discord/index.server";

import { channelMessagesSince, deleteMessages } from "./message-rows.server";
import { storeMessages } from "./store-messages.server";
import type { StoreTarget } from "./store-messages.server";

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
}>;

const idsOf = (page: readonly DiscordMessage[]): readonly string[] => page.map(({ id }) => id);

const isFullPage = (page: readonly DiscordMessage[]): boolean => page.length >= PAGE_SIZE;

const backfillAfter = (page: readonly DiscordMessage[]): Backfill =>
  Boolean.match(isFullPage(page), { onTrue: () => "pending", onFalse: () => "done" });

const fetchAndStore = (
  target: StoreTarget,
  request: MessagePage,
): Effect.Effect<readonly DiscordMessage[], DiscordRequestError> =>
  listMessages(target.job.channelId, request).pipe(
    Effect.tap((page) => storeMessages({ ...target, page })),
  );

const loadProgress = (job: IngestJob): Effect.Effect<Option.Option<ChannelProgress>> =>
  Effect.promise(() =>
    db
      .select({
        wrappedKey: guild.wrappedKey,
        newest: channel.newestMessageId,
        oldest: channel.oldestMessageId,
        backfill: channel.backfill,
      })
      .from(channel)
      .innerJoin(guild, eq(channel.guildId, guild.id))
      .where(and(eq(channel.id, job.channelId), eq(channel.guildId, job.guildId))),
  ).pipe(Effect.map(Array.head));

const oldestTimestamp = (page: readonly DiscordMessage[]): Option.Option<DateTime.DateTime> =>
  Array.match(page, {
    onEmpty: () => Option.none(),
    onNonEmpty: (nonEmpty) => {
      const timestamps = pipe(
        nonEmpty,
        Array.map(({ timestamp }) => timestamp),
      );
      return Option.some(Array.min(timestamps, DateTime.Order));
    },
  });

const removeDeleted = (job: IngestJob, latest: readonly DiscordMessage[]): Effect.Effect<void> => {
  const since = Option.some(latest).pipe(
    Option.filter(isFullPage),
    Option.flatMap(oldestTimestamp),
  );
  const present = new Set(idsOf(latest));
  return channelMessagesSince({ channelId: job.channelId, since }).pipe(
    Effect.map((stored) => stored.filter((id) => !present.has(id))),
    Effect.flatMap(deleteMessages),
  );
};

const pageForward = (
  target: StoreTarget,
  stopAt: string,
  { cursor, remaining }: Cursor,
): Effect.Effect<Option.Option<string>, DiscordRequestError> =>
  fetchAndStore(target, { direction: "after", cursor }).pipe(
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
): Effect.Effect<string, DiscordRequestError> => {
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
): Effect.Effect<History, DiscordRequestError> =>
  fetchAndStore(target, { direction: "before", cursor }).pipe(
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
): Effect.Effect<Option.Option<string>, DiscordRequestError> =>
  Option.match(Option.fromNullOr(progress.newest), {
    onNone: () => Effect.succeed(newestId(idsOf(latest))),
    onSome: (frontier) => Effect.asSome(catchUp(target, frontier, latest)),
  });

const advanceOldest = (
  target: StoreTarget,
  progress: ChannelProgress,
  latest: readonly DiscordMessage[],
): Effect.Effect<History, DiscordRequestError> => {
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

const saveProgress = (
  job: IngestJob,
  newest: Option.Option<string>,
  history: History,
): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.promise(() =>
      db
        .update(channel)
        .set({
          newestMessageId: Option.getOrNull(newest),
          oldestMessageId: Option.getOrNull(history.oldest),
          backfill: history.backfill,
        })
        .where(eq(channel.id, job.channelId)),
    ),
  );

const ingestWith = (
  job: IngestJob,
  progress: ChannelProgress,
): Effect.Effect<void, DiscordRequestError> =>
  Effect.gen(function* ingest() {
    const key = yield* openGuildKey(progress.wrappedKey);
    const target = { key, job };
    const latest = yield* fetchAndStore(target, { direction: "latest" });
    yield* removeDeleted(job, latest);
    const newest = yield* advanceNewest(target, progress, latest);
    const history = yield* advanceOldest(target, progress, latest);
    yield* saveProgress(job, newest, history);
  });

const ingestChannel = (job: IngestJob): Effect.Effect<void, DiscordRequestError> =>
  loadProgress(job).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (progress) => ingestWith(job, progress),
      }),
    ),
  );

export { ingestChannel };
