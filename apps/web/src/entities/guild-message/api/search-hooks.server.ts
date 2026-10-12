import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Effect, Option, Semaphore } from "effect";

import type { TrackedRow } from "#/entities/guild-message/model/stored-message";

import { FLUSH_DELAY_MS, forgetRows, publishGuild, scheduleSearch } from "./search-alarm.server";
import type { Alarms } from "./search-alarm.server";
import { deletePrefix } from "./search-files.server";
import { writeSearchHead } from "./search-publish.server";

const ONE_PUBLISH = 1;

type HookTarget = Readonly<{
  db: DrizzleSqliteDODatabase;
  alarms: Alarms;
  bucket: Readonly<R2Bucket>;
  guildId: Option.Option<string>;
}>;

type SearchHooks = Readonly<{
  forget: (rows: readonly TrackedRow[]) => Effect.Effect<void>;
  flushLater: () => Effect.Effect<void>;
  publish: () => Effect.Effect<void>;
  clearFiles: () => Effect.Effect<void>;
}>;

const searchHooks = ({ db, alarms, bucket, guildId }: HookTarget): SearchHooks => {
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
    publish: () =>
      named((id) => publishing.withPermit(publishGuild({ db, alarms, bucket, guildId: id }))),
    clearFiles: () => named((id) => deletePrefix({ bucket, guildId: id })),
  };
};

export { nextVersion } from "./search-alarm.server";
export { searchHooks };
