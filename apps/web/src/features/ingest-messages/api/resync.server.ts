import { Effect } from "effect";

import type { DiscordRequestError } from "#/shared/discord/index.server";

import { refreshIngest } from "./consent-scope.server.ts";
import { enqueueCatchUps } from "./enqueue.server.ts";
import { reconcileMembership } from "./guild-membership.server.ts";
import { whenIngestEnabled } from "./ingest-flag.server.ts";
import { startMigration } from "./migrate-messages.server.ts";
import { rewrapWhileRotating } from "./rewrap-keys.server.ts";
import { syncMembers } from "./store-members.server.ts";
import { syncOneGuild } from "./sync-guilds.server.ts";

export const resyncGuilds: Effect.Effect<void, DiscordRequestError> = whenIngestEnabled(
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

export const catchUpGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  syncOneGuild(guildId).pipe(
    Effect.andThen(syncMembers(guildId)),
    Effect.andThen(refreshIngest(guildId)),
  );
