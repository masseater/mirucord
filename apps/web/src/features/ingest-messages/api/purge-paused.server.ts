import { and, eq } from "drizzle-orm";
import { Array, Effect, pipe } from "effect";

import { channel, db } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { whenManaged } from "./managed-guild.server.ts";
import type { GuildMembership } from "./managed-guild.server.ts";
import { purgeChannel } from "./purge-channel.server.ts";

export type PurgeRequest = GuildMembership & Readonly<{ channelId: string }>;

export type PurgeResult =
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
      return Effect.promise(() =>
        db
          .select({ id: channel.id })
          .from(channel)
          .where(
            and(eq(channel.parentId, request.channelId), eq(channel.guildId, request.guildId)),
          ),
      ).pipe(
        Effect.flatMap((threads) =>
          Effect.forEach(
            [
              request.channelId,
              ...pipe(
                threads,
                Array.map(({ id }) => id),
              ),
            ],
            (channelId) => purgeChannel({ guildId: request.guildId, channelId }),
            { concurrency: 1, discard: true },
          ),
        ),
        Effect.andThen(Effect.logInfo("Purged a paused channel on request")),
        Effect.annotateLogs({ guildId: request.guildId, channelId: request.channelId }),
        Effect.as<PurgeResult>({ status: "purged" }),
      );
    }),
  );

export const purgePausedChannel = (
  request: PurgeRequest,
): Effect.Effect<PurgeResult, DiscordRequestError> =>
  whenManaged({
    membership: request,
    denied: { status: "forbidden" },
    use: () => purgeIfHidden(request),
  });
