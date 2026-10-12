import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Clock, Effect, Option } from "effect";

import { reindexMissing } from "./reindex.server";
import { searchLedger } from "./search-ledger.server";
import { publishSearch } from "./search-publish.server";
import type { TrackedRow } from "./store-types";

const FLUSH_DELAY_MS = 300_000;
const NO_DELAY = 0;

type Alarms = Readonly<{
  current: () => Promise<number | null>;
  set: (at: number) => Promise<void>;
}>;

type Alarmed = Readonly<{ db: DrizzleSqliteDODatabase; alarms: Alarms }>;

type Scheduled = Alarmed & Readonly<{ delay: number }>;

type Forgotten = Alarmed &
  Readonly<{ rows: readonly TrackedRow[]; publishHead: Effect.Effect<void> }>;

type Published = Alarmed & Readonly<{ bucket: Readonly<R2Bucket>; guildId: string }>;

const scheduleSearch = ({ alarms, delay }: Scheduled): Effect.Effect<void> =>
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

const forgetRows = ({ db, alarms, rows, publishHead }: Forgotten): Effect.Effect<void> => {
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

const nextVersion = (db: DrizzleSqliteDODatabase): number => searchLedger(db).nextVersion();

const publishIndexed = (published: Published): Effect.Effect<void> => {
  const { db, bucket, guildId } = published;
  return Clock.currentTimeMillis.pipe(
    Effect.flatMap((now) => publishSearch({ db, bucket, guildId, now })),
    Effect.flatMap((next) => scheduleNext(published, next)),
  );
};

const afterReindex = (published: Published, remaining: boolean): Effect.Effect<void> => {
  if (remaining) {
    return scheduleSearch({ ...published, delay: NO_DELAY });
  }
  return publishIndexed(published);
};

const publishGuild = (published: Published): Effect.Effect<void> =>
  reindexMissing({ store: published.db, guildId: published.guildId }).pipe(
    Effect.flatMap((remaining) => afterReindex(published, remaining)),
  );

export { FLUSH_DELAY_MS, forgetRows, nextVersion, publishGuild, scheduleSearch };
export type { Alarmed, Alarms, Forgotten, Published, Scheduled };
