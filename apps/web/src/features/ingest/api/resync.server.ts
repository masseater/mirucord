import { Effect } from "effect";

import type { DiscordRequestError } from "#/shared/discord/index.server";

import { refreshIngest } from "./consent-scope.server";
import { enqueueCatchUps } from "./enqueue.server";
import { reconcileMembership } from "./guild-membership.server";
import { whenIngestEnabled } from "./ingest-flag.server";
import { startMigration } from "./migrate-messages.server";
import { rewrapWhileRotating } from "./rewrap-keys.server";
import { syncOneGuild } from "./sync-guilds.server";

const resyncGuilds: Effect.Effect<void, DiscordRequestError> = whenIngestEnabled(
  Effect.gen(function* resync() {
    yield* rewrapWhileRotating;
    const { admitted } = yield* reconcileMembership;
    yield* enqueueCatchUps(admitted);
    yield* startMigration;
    yield* Effect.logInfo("Gateway session started; catching up every server").pipe(
      Effect.annotateLogs({ guilds: admitted.length }),
    );
  }),
);

const catchUpGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  syncOneGuild(guildId).pipe(Effect.andThen(refreshIngest(guildId)));

export { catchUpGuild, resyncGuilds };
