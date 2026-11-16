import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Clock, Effect, Option } from "effect";

import { FLUSH_DELAY_MS } from "#/entities/guild-message/lib/search-layout";

import { reindexMissing } from "./reindex.server";
import { searchLedger } from "./search-ledger.server";
import { publishSearch } from "./search-publish.server";
import type { Flush } from "./search-recent.server";
import type { TrackedRow } from "./store-types";

const NO_DELAY = 0;

export type Alarms = Readonly<{
  current: () => Promise<number | null>;
  set: (at: number) => Promise<void>;
}>;

export type Alarmed = Readonly<{ db: DrizzleSqliteDODatabase; alarms: Alarms }>;

export type Scheduled = Alarmed & Readonly<{ delay: number }>;

export type Forgotten = Alarmed &
  Readonly<{ rows: readonly TrackedRow[]; publishHead: Effect.Effect<void> }>;

export type Published = Alarmed & Readonly<{ bucket: Readonly<R2Bucket>; guildId: string }>;

export type Flushing = Published & Readonly<{ flush: Flush }>;

export const scheduleSearch = ({ alarms, delay }: Scheduled): Effect.Effect<void> =>
  Effect.all({
    now: Clock.currentTimeMillis,
    current: Effect.promise(() => alarms.current()),
  }).pipe(
    Effect.flatMap(({ now, current }) => {
      const wanted = now + delay;
      const later = Option.match(Option.fromNullOr(current), {
        onNone: () => true,
        onSome: (scheduled) => scheduled > wanted,
      });
      return Effect.when(
        Effect.promise(() => alarms.set(wanted)),
        Effect.succeed(later),
      );
    }),
    Effect.asVoid,
  );

export const forgetRows = ({ db, alarms, rows, publishHead }: Forgotten): Effect.Effect<void> => {
  const published = publishHead.pipe(
    Effect.andThen(scheduleSearch({ db, alarms, delay: FLUSH_DELAY_MS })),
  );
  return Clock.currentTimeMillis.pipe(
    Effect.map((now) => searchLedger(db).invalidate(searchLedger(db).positions(rows), now)),
    Effect.flatMap((changed) => Effect.when(published, Effect.succeed(changed))),
    Effect.asVoid,
  );
};

const scheduleNext = (alarmed: Alarmed, next: Option.Option<number>): Effect.Effect<void> =>
  Option.match(next, {
    onNone: () => Effect.void,
    onSome: (at) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          scheduleSearch({ ...alarmed, delay: Math.max(at - now, NO_DELAY) }),
        ),
      ),
  });

export const nextVersion = (db: DrizzleSqliteDODatabase): number => searchLedger(db).nextVersion();

const publishIndexed = (published: Flushing): Effect.Effect<void> => {
  const { db, bucket, guildId, flush } = published;
  return Clock.currentTimeMillis.pipe(
    Effect.flatMap((now) => publishSearch({ db, bucket, guildId, now, flush })),
    Effect.flatMap((next) => scheduleNext(published, next)),
  );
};

const afterReindex = (published: Flushing, remaining: boolean): Effect.Effect<void> => {
  if (remaining) {
    return scheduleSearch({ ...published, delay: NO_DELAY });
  }
  return publishIndexed(published);
};

export const publishGuild = (published: Flushing): Effect.Effect<void> =>
  reindexMissing({ store: published.db, guildId: published.guildId }).pipe(
    Effect.flatMap((remaining) => afterReindex(published, remaining)),
  );
