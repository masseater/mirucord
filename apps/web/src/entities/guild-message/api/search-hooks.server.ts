import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Clock, Effect, Option, Semaphore } from "effect";

import { FLUSH_DELAY_MS } from "#/entities/guild-message/lib/search-layout";

import { forgetRows, publishGuild, scheduleSearch } from "./search-alarm.server.ts";
import type { Alarms } from "./search-alarm.server.ts";
import { deletePrefix } from "./search-files.server.ts";
import { writeSearchHead } from "./search-head.server.ts";
import type { Flush } from "./search-recent.server.ts";
import type { TrackedRow } from "./store-types.ts";
import { publishGuildVectors } from "./vector-alarm.server.ts";

const ONE_PUBLISH = 1;
const NO_DELAY = 0;

export type HookTarget = Readonly<{
  db: DrizzleSqliteDODatabase;
  alarms: Alarms;
  bucket: Readonly<R2Bucket>;
  guildId: Option.Option<string>;
}>;

export type SearchHooks = Readonly<{
  forget: (rows: readonly TrackedRow[]) => Effect.Effect<void>;
  flushLater: () => Effect.Effect<void>;
  scheduleAt: (at: number) => Effect.Effect<void>;
  publish: (flush: Flush) => Effect.Effect<void>;
  vectors: () => Effect.Effect<void>;
  clearFiles: () => Effect.Effect<void>;
}>;

export const searchHooks = ({ db, alarms, bucket, guildId }: HookTarget): SearchHooks => {
  const publishing = Semaphore.makeUnsafe(ONE_PUBLISH);
  const named = (run: (id: string) => Effect.Effect<void>): Effect.Effect<void> =>
    Option.match(guildId, {
      onNone: () => Effect.logWarning("Guild store has no name; search is skipped"),
      onSome: run,
    });
  const publishHead = named((id) =>
    publishing.withPermit(writeSearchHead({ db, bucket, guildId: id })),
  );
  return {
    forget: (rows) => forgetRows({ db, alarms, rows, publishHead }),
    flushLater: () => scheduleSearch({ db, alarms, delay: FLUSH_DELAY_MS }),
    scheduleAt: (at) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          scheduleSearch({ db, alarms, delay: Math.max(at - now, NO_DELAY) }),
        ),
      ),
    publish: (flush) =>
      named((id) =>
        publishing.withPermit(publishGuild({ db, alarms, bucket, guildId: id, flush })),
      ),
    vectors: () =>
      named((id) =>
        publishing.withPermit(publishGuildVectors({ db, alarms, bucket, guildId: id })),
      ),
    clearFiles: () => named((id) => deletePrefix({ bucket, guildId: id })),
  };
};

export { nextVersion } from "./search-alarm.server.ts";
