import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Clock, Effect, Option } from "effect";

import { FLUSH_DELAY_MS } from "#/entities/guild-message/lib/search-layout";

import { reindexMissing } from "./reindex.server";
import { searchLedger } from "./search-ledger.server";
import { publishSearch } from "./search-publish.server";
import type { Flush } from "./search-recent.server";
import type { TrackedRow } from "./store-types";

const NO_DELAY = 0;

type Alarms = Readonly<{
  current: () => Promise<number | null>;
  set: (at: number) => Promise<void>;
}>;

type AlarmTarget = Readonly<{ db: DrizzleSqliteDODatabase; alarms: Alarms }>;

type ScheduleTarget = AlarmTarget & Readonly<{ delay: number }>;

type ForgetTarget = AlarmTarget &
  Readonly<{ rows: readonly TrackedRow[]; publishHead: Effect.Effect<void> }>;

type PublishTarget = AlarmTarget & Readonly<{ bucket: Readonly<R2Bucket>; guildId: string }>;

type FlushTarget = PublishTarget & Readonly<{ flush: Flush }>;

const scheduleSearch = ({ alarms, delay }: ScheduleTarget): Effect.Effect<void> =>
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

const forgetRows = ({ db, alarms, rows, publishHead }: ForgetTarget): Effect.Effect<void> => {
  const published = publishHead.pipe(
    Effect.andThen(scheduleSearch({ db, alarms, delay: FLUSH_DELAY_MS })),
  );
  return Clock.currentTimeMillis.pipe(
    Effect.map((now) => searchLedger(db).invalidate(searchLedger(db).positions(rows), now)),
    Effect.flatMap((changed) => Effect.when(published, Effect.succeed(changed))),
    Effect.asVoid,
  );
};

const scheduleNext = (target: AlarmTarget, next: Option.Option<number>): Effect.Effect<void> =>
  Option.match(next, {
    onNone: () => Effect.void,
    onSome: (at) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) => scheduleSearch({ ...target, delay: Math.max(at - now, NO_DELAY) })),
      ),
  });

const nextVersion = (db: DrizzleSqliteDODatabase): number => searchLedger(db).nextVersion();

const publishIndexed = (target: FlushTarget): Effect.Effect<void> => {
  const { db, bucket, guildId, flush } = target;
  return Clock.currentTimeMillis.pipe(
    Effect.flatMap((now) => publishSearch({ db, bucket, guildId, now, flush })),
    Effect.flatMap((next) => scheduleNext(target, next)),
  );
};

const afterReindex = (target: FlushTarget, remaining: boolean): Effect.Effect<void> => {
  if (remaining) {
    return scheduleSearch({ ...target, delay: NO_DELAY });
  }
  return publishIndexed(target);
};

const publishGuild = (target: FlushTarget): Effect.Effect<void> =>
  reindexMissing({ store: target.db, guildId: target.guildId }).pipe(
    Effect.flatMap((remaining) => afterReindex(target, remaining)),
  );

export { forgetRows, nextVersion, publishGuild, scheduleSearch };
export type { AlarmTarget, Alarms, FlushTarget, ForgetTarget, PublishTarget, ScheduleTarget };
