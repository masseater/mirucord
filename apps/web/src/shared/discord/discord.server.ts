import { DiscordMessageSchema } from "@repo/shared-util-discord";
import type { DiscordMessage } from "@repo/shared-util-discord";
import { ChannelType, OverwriteType } from "discord-api-types/v10";
import { Array, Effect, Function, Option, Schema } from "effect";

import { decodeBody, decodeList, withDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";

const DATA_FIRST_ARITY = 2;

const PAGE_SIZE = 100;
const NOT_FOUND = 404;
const FORBIDDEN = 403;

const PermissionOverwrite = Schema.Struct({
  id: Schema.String,
  type: Schema.Enum(OverwriteType),
  allow: Schema.String,
  deny: Schema.String,
});

const Guild = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optional(Schema.NullOr(Schema.String)),
  owner_id: Schema.String,
  system_channel_id: Schema.optional(Schema.NullOr(Schema.String)),
  roles: Schema.Array(Schema.Struct({ id: Schema.String, permissions: Schema.String })),
});

const PartialGuild = Schema.Struct({ id: Schema.String });

const User = Schema.Struct({ id: Schema.String });

const ThreadMetadata = Schema.Struct({ archive_timestamp: Schema.NullOr(Schema.String) });

const Channel = Schema.Struct({
  id: Schema.String,
  type: Schema.Enum(ChannelType),
  name: Schema.optional(Schema.NullOr(Schema.String)),
  parent_id: Schema.optional(Schema.NullOr(Schema.String)),
  position: Schema.optional(Schema.Finite),
  permission_overwrites: Schema.optional(Schema.Array(PermissionOverwrite)),
  thread_metadata: Schema.optional(ThreadMetadata),
});

const ThreadList = Schema.Struct({ threads: Schema.Array(Channel) });

const ArchivedThreadList = Schema.Struct({
  threads: Schema.Array(Channel),
  has_more: Schema.Boolean,
});

const Member = Schema.Struct({ roles: Schema.Array(Schema.String) });

type DiscordGuild = typeof Guild.Type;
type DiscordChannel = typeof Channel.Type;
type DiscordMember = typeof Member.Type;

const decodeGuilds = decodeList(PartialGuild);

const decodeUser = decodeBody(User);

const decodeGuild = decodeBody(Guild);

const decodeChannels = decodeList(Channel);

const decodeThreadList = decodeBody(ThreadList);

const decodeArchivedThreadList = decodeBody(ArchivedThreadList);

const decodeMessages = decodeList(DiscordMessageSchema);

const decodeMember = decodeBody(Member);

const decodeMessage = decodeBody(DiscordMessageSchema);

const listBotGuilds: Effect.Effect<readonly Readonly<{ id: string }>[], DiscordRequestError> =
  withDiscord((rest) => rest.listMyGuilds().pipe(Effect.flatMap(decodeGuilds)));

const getBotUserId: Effect.Effect<string, DiscordRequestError> = withDiscord((rest) =>
  rest.getMyUser().pipe(
    Effect.flatMap(decodeUser),
    Effect.map(({ id }) => id),
  ),
);

const leaveGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  withDiscord((rest) => rest.leaveGuild(guildId));

const getGuild = (guildId: string): Effect.Effect<DiscordGuild, DiscordRequestError> =>
  withDiscord((rest) => rest.getGuild(guildId).pipe(Effect.flatMap(decodeGuild)));

const listGuildChannels = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  withDiscord((rest) => rest.listGuildChannels(guildId).pipe(Effect.flatMap(decodeChannels)));

const listActiveThreads = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  withDiscord((rest) =>
    rest.getActiveGuildThreads(guildId).pipe(
      Effect.flatMap(decodeThreadList),
      Effect.map(({ threads }) => threads),
    ),
  );

const listArchivedThreadsBefore = (
  channelId: string,
  before: Option.Option<string>,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  withDiscord((rest) =>
    rest.listPublicArchivedThreads(channelId, {
      limit: PAGE_SIZE,
      before: Option.getOrUndefined(before),
    }),
  ).pipe(
    Effect.flatMap(decodeArchivedThreadList),
    Effect.flatMap(({ threads, has_more }) => {
      const next = Array.last(threads).pipe(
        Option.flatMap(({ thread_metadata }) => Option.fromUndefinedOr(thread_metadata)),
        Option.flatMap(({ archive_timestamp }) => Option.fromNullOr(archive_timestamp)),
        Option.filter(() => has_more),
      );
      return Option.match(next, {
        onNone: () => Effect.succeed(threads),
        onSome: (cursor) =>
          listArchivedThreadsBefore(channelId, Option.some(cursor)).pipe(
            Effect.map((older) => [...threads, ...older]),
          ),
      });
    }),
  );

const listArchivedThreads = (
  channelId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  listArchivedThreadsBefore(channelId, Option.none());

type MessagePage =
  | Readonly<{ direction: "latest" }>
  | Readonly<{ direction: "after" | "before"; cursor: string }>;

const pageParams = (
  page: MessagePage,
): Readonly<{ limit: number; before?: string; after?: string }> => {
  if (page.direction === "latest") {
    return { limit: PAGE_SIZE };
  }
  return { limit: PAGE_SIZE, [page.direction]: page.cursor };
};

const listMessagesDataFirst = (
  channelId: string,
  page: MessagePage,
): Effect.Effect<readonly DiscordMessage[], DiscordRequestError> =>
  withDiscord((rest) =>
    rest.listMessages(channelId, pageParams(page)).pipe(Effect.flatMap(decodeMessages)),
  );

const listMessages: {
  (
    page: MessagePage,
  ): (channelId: string) => Effect.Effect<readonly DiscordMessage[], DiscordRequestError>;
  (
    channelId: string,
    page: MessagePage,
  ): Effect.Effect<readonly DiscordMessage[], DiscordRequestError>;
} = Function.dual(DATA_FIRST_ARITY, listMessagesDataFirst);

const orNotFound = <Found, Services>(
  request: Effect.Effect<Found, DiscordRequestError, Services>,
): Effect.Effect<Option.Option<Found>, DiscordRequestError, Services> =>
  request.pipe(
    Effect.asSome,
    Effect.catchIf(
      (error) => Option.contains(error.status, NOT_FOUND),
      () => Effect.succeedNone,
    ),
  );

const findMemberDataFirst = (
  guildId: string,
  userId: string,
): Effect.Effect<Option.Option<DiscordMember>, DiscordRequestError> =>
  orNotFound(
    withDiscord((rest) => rest.getGuildMember(guildId, userId).pipe(Effect.flatMap(decodeMember))),
  );

const findMember: {
  (
    userId: string,
  ): (guildId: string) => Effect.Effect<Option.Option<DiscordMember>, DiscordRequestError>;
  (
    guildId: string,
    userId: string,
  ): Effect.Effect<Option.Option<DiscordMember>, DiscordRequestError>;
} = Function.dual(DATA_FIRST_ARITY, findMemberDataFirst);

const findMessageDataFirst = (
  channelId: string,
  messageId: string,
): Effect.Effect<Option.Option<DiscordMessage>, DiscordRequestError> =>
  orNotFound(
    withDiscord((rest) =>
      rest.getMessage(channelId, messageId).pipe(Effect.flatMap(decodeMessage)),
    ),
  );

const findMessage: {
  (
    messageId: string,
  ): (channelId: string) => Effect.Effect<Option.Option<DiscordMessage>, DiscordRequestError>;
  (
    channelId: string,
    messageId: string,
  ): Effect.Effect<Option.Option<DiscordMessage>, DiscordRequestError>;
} = Function.dual(DATA_FIRST_ARITY, findMessageDataFirst);

export {
  FORBIDDEN,
  findMember,
  findMessage,
  getBotUserId,
  getGuild,
  leaveGuild,
  listActiveThreads,
  listArchivedThreads,
  listBotGuilds,
  listGuildChannels,
  listMessages,
  NOT_FOUND,
  PAGE_SIZE,
};
export type { DiscordChannel, DiscordGuild, DiscordMember, MessagePage };
