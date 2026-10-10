import { Array, Effect, Option, Record } from "effect";

import { findMember } from "#/shared/discord/index.server";
import type {
  DiscordChannel,
  DiscordGuild,
  DiscordRequestError,
} from "#/shared/discord/index.server";
import { visibleChannelIds } from "#/shared/permissions";

type BotView = Readonly<{
  botUserId: string;
  discordGuild: DiscordGuild;
  channels: readonly DiscordChannel[];
}>;

const botReadableChannels = ({
  botUserId,
  discordGuild,
  channels,
}: BotView): Effect.Effect<ReadonlySet<string>, DiscordRequestError> =>
  findMember(discordGuild.id, botUserId).pipe(
    Effect.map((member) =>
      visibleChannelIds(
        {
          guildId: discordGuild.id,
          ownerId: discordGuild.owner_id,
          rolePermissions: Record.fromEntries(
            discordGuild.roles.map(({ id, permissions }) => [id, permissions]),
          ),
          channels: channels.map((discordChannel) => ({
            id: discordChannel.id,
            parentId: Option.fromNullishOr(discordChannel.parent_id),
            type: discordChannel.type,
            permissionOverwrites: Option.getOrElse(
              Option.fromNullishOr(discordChannel.permission_overwrites),
              Array.empty,
            ),
          })),
        },
        member.pipe(Option.map(({ roles }) => ({ userId: botUserId, roleIds: roles }))),
      ),
    ),
  );

export { botReadableChannels };
export type { BotView };
