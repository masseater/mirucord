import { Array, Effect, Option, Record } from "effect";

import { findMember } from "#/shared/discord/index.server";
import type {
  DiscordChannel,
  DiscordGuild,
  DiscordRequestError,
} from "#/shared/discord/index.server";
import { postableChannelIds, visibleChannelIds } from "#/shared/permissions";

type BotView = Readonly<{
  botUserId: string;
  discordGuild: DiscordGuild;
}>;

type BotReader = (
  channels: readonly DiscordChannel[],
) => Readonly<{ readable: ReadonlySet<string>; postable: ReadonlySet<string> }>;

const botReader = ({
  botUserId,
  discordGuild,
}: BotView): Effect.Effect<BotReader, DiscordRequestError> =>
  findMember(discordGuild.id, botUserId).pipe(
    Effect.map((member) => (channels: readonly DiscordChannel[]): ReturnType<BotReader> => {
      const snapshot = {
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
      };
      const bot = member.pipe(Option.map(({ roles }) => ({ userId: botUserId, roleIds: roles })));
      return {
        readable: visibleChannelIds(snapshot, bot),
        postable: postableChannelIds(snapshot, bot),
      };
    }),
  );

export { botReader };
export type { BotReader, BotView };
