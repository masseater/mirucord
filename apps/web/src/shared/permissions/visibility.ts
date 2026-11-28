import { ChannelType } from "discord-api-types/v10";
import { Array, Function, Option, pipe } from "effect";

import { THREAD_TYPES } from "#/shared/discord";

import { canReadHistory, canSendMessages } from "./permissions.ts";
import type { Overwrite, ReaderContext } from "./permissions.ts";

export type GuildChannel = Readonly<{
  id: string;
  parentId: Option.Option<string>;
  type: ChannelType;
  permissionOverwrites: readonly Overwrite[];
}>;

export type GuildSnapshot = Readonly<{
  guildId: string;
  ownerId: string;
  rolePermissions: Readonly<Record<string, string>>;
  channels: readonly GuildChannel[];
}>;

export type Member = Readonly<{ userId: string; roleIds: readonly string[] }>;

const DATA_FIRST_ARITY = 2;

const ANY_THREAD_TYPES: ReadonlySet<ChannelType> = new Set([
  ...THREAD_TYPES,
  ChannelType.PrivateThread,
]);

const isThread = ({ type }: GuildChannel): boolean => ANY_THREAD_TYPES.has(type);

type ChannelCheck = (reader: ReaderContext, overwrites: readonly Overwrite[]) => boolean;

const allowedChannels = (
  snapshot: GuildSnapshot,
  member: Member,
  check: ChannelCheck,
): ReadonlySet<string> => {
  const reader = {
    guildId: snapshot.guildId,
    ownerId: snapshot.ownerId,
    userId: member.userId,
    memberRoleIds: member.roleIds,
    rolePermissions: snapshot.rolePermissions,
  };
  return new Set(
    pipe(
      snapshot.channels,
      Array.filter(
        (guildChannel) =>
          !isThread(guildChannel) && check(reader, guildChannel.permissionOverwrites),
      ),
      Array.map(({ id }) => id),
    ),
  );
};

const forMember = (
  compute: (snapshot: GuildSnapshot, member: Member) => ReadonlySet<string>,
): {
  (member: Option.Option<Member>): (snapshot: GuildSnapshot) => ReadonlySet<string>;
  (snapshot: GuildSnapshot, member: Option.Option<Member>): ReadonlySet<string>;
} =>
  Function.dual(
    DATA_FIRST_ARITY,
    (snapshot: GuildSnapshot, member: Option.Option<Member>): ReadonlySet<string> =>
      Option.match(member, {
        onNone: () => new Set<string>(),
        onSome: (present) => compute(snapshot, present),
      }),
  );

const readableWithThreads = (snapshot: GuildSnapshot, member: Member): ReadonlySet<string> => {
  const readable = allowedChannels(snapshot, member, canReadHistory);
  const threads = pipe(
    snapshot.channels,
    Array.filter(
      (guildChannel) =>
        THREAD_TYPES.has(guildChannel.type) &&
        Option.exists(guildChannel.parentId, (parentId) => readable.has(parentId)),
    ),
    Array.map(({ id }) => id),
  );
  return new Set([...readable, ...threads]);
};

export const visibleChannelIds = forMember(readableWithThreads);

export const postableChannelIds = forMember((snapshot, member) =>
  allowedChannels(snapshot, member, canSendMessages),
);
