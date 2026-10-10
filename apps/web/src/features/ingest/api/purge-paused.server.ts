import { and, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { channel, db } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { purgeChannel } from "./consent-scope.server";
import { managedGuild } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";

type PurgeRequest = GuildMembership & Readonly<{ channelId: string }>;

type PurgeResult =
  | Readonly<{ status: "purged" }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{ status: "notPaused" }>;

const findHidden = ({ guildId, channelId }: PurgeRequest): Effect.Effect<boolean> =>
  Effect.promise(() =>
    db
      .select({ id: channel.id })
      .from(channel)
      .where(
        and(
          eq(channel.id, channelId),
          eq(channel.guildId, guildId),
          eq(channel.botAccess, "hidden"),
        ),
      ),
  ).pipe(Effect.map(Array.isReadonlyArrayNonEmpty));

const purgeIfHidden = (request: PurgeRequest): Effect.Effect<PurgeResult> =>
  findHidden(request).pipe(
    Effect.flatMap((hidden) => {
      if (!hidden) {
        return Effect.succeed<PurgeResult>({ status: "notPaused" });
      }
      return purgeChannel(request.channelId).pipe(
        Effect.andThen(Effect.logInfo("Purged a paused channel on request")),
        Effect.annotateLogs({ guildId: request.guildId, channelId: request.channelId }),
        Effect.as<PurgeResult>({ status: "purged" }),
      );
    }),
  );

const purgePausedChannel = (
  request: PurgeRequest,
): Effect.Effect<PurgeResult, DiscordRequestError> =>
  managedGuild(request).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed<PurgeResult>({ status: "forbidden" }),
        onSome: () => purgeIfHidden(request),
      }),
    ),
  );

export { purgePausedChannel };
export type { PurgeRequest, PurgeResult };
