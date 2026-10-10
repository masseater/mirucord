import { ChannelType } from "discord-api-types/v10";
import { Boolean, Function, Option } from "effect";

import { canReadHistory, canReadVoiceHistory } from "./permissions";
import type { Overwrite } from "./permissions";

type GuildChannel = Readonly<{
  id: string;
  parentId: Option.Option<string>;
  type: number;
  permissionOverwrites: readonly Overwrite[];
}>;

type GuildSnapshot = Readonly<{
  guildId: string;
  ownerId: string;
  rolePermissions: Readonly<Record<string, string>>;
  channels: readonly GuildChannel[];
}>;

type Member = Readonly<{ userId: string; roleIds: readonly string[] }>;

const DATA_FIRST_ARITY = 2;

const PUBLIC_THREAD_TYPES: ReadonlySet<number> = new Set([
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
]);

const THREAD_TYPES: ReadonlySet<number> = new Set([
  ...PUBLIC_THREAD_TYPES,
  ChannelType.PrivateThread,
]);

const VOICE_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
]);

const isThread = ({ type }: GuildChannel): boolean => THREAD_TYPES.has(type);

const readableChannels = (snapshot: GuildSnapshot, member: Member): ReadonlySet<string> => {
  const reader = {
    guildId: snapshot.guildId,
    ownerId: snapshot.ownerId,
    userId: member.userId,
    memberRoleIds: member.roleIds,
    rolePermissions: snapshot.rolePermissions,
  };
  return new Set(
    snapshot.channels
      .filter(
        (guildChannel) =>
          !isThread(guildChannel) &&
          Boolean.match(VOICE_TYPES.has(guildChannel.type), {
            onTrue: () => canReadVoiceHistory(reader, guildChannel.permissionOverwrites),
            onFalse: () => canReadHistory(reader, guildChannel.permissionOverwrites),
          }),
      )
      .map(({ id }) => id),
  );
};

const visibleChannelIdsDataFirst = (
  snapshot: GuildSnapshot,
  member: Option.Option<Member>,
): ReadonlySet<string> =>
  Option.match(member, {
    onNone: () => new Set<string>(),
    onSome: (present) => {
      const readable = readableChannels(snapshot, present);
      const threads = snapshot.channels
        .filter(
          (guildChannel) =>
            PUBLIC_THREAD_TYPES.has(guildChannel.type) &&
            Option.exists(guildChannel.parentId, (parentId) => readable.has(parentId)),
        )
        .map(({ id }) => id);
      return new Set([...readable, ...threads]);
    },
  });

const visibleChannelIds: {
  (member: Option.Option<Member>): (snapshot: GuildSnapshot) => ReadonlySet<string>;
  (snapshot: GuildSnapshot, member: Option.Option<Member>): ReadonlySet<string>;
} = Function.dual(DATA_FIRST_ARITY, visibleChannelIdsDataFirst);

export { visibleChannelIds };
export type { GuildChannel, GuildSnapshot, Member };
