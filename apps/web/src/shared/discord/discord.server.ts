import { DiscordMessageSchema } from "@repo/shared-util-discord";
import type { DiscordMessage } from "@repo/shared-util-discord";
import { ChannelType, OverwriteType } from "discord-api-types/v10";
import type { APIOverwrite, APIRole } from "discord-api-types/v10";
import { Array, Effect, Function, Option, Schema } from "effect";

import { decodeBody, withDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";

const DATA_FIRST_ARITY = 2;

export const PAGE_SIZE = 100;
export const NOT_FOUND = 404;
export const FORBIDDEN = 403;

const PermissionOverwrite = Schema.Struct({
  id: Schema.String,
  type: Schema.Enum(OverwriteType),
  allow: Schema.String,
  deny: Schema.String,
}) satisfies Schema.Decoder<APIOverwrite>;

const Role = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  permissions: Schema.String,
}) satisfies Schema.Decoder<Pick<APIRole, "id" | "name" | "permissions">>;

const Guild = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.String.pipe(Schema.NullOr, Schema.optional),
  owner_id: Schema.String,
  system_channel_id: Schema.String.pipe(Schema.NullOr, Schema.optional),
  roles: Schema.Array(Role),
});

const PartialGuild = Schema.Struct({ id: Schema.String });

const User = Schema.Struct({ id: Schema.String });

const ThreadMetadata = Schema.Struct({ archive_timestamp: Schema.NullOr(Schema.String) });

const Channel = Schema.Struct({
  id: Schema.String,
  type: Schema.Enum(ChannelType),
  name: Schema.String.pipe(Schema.NullOr, Schema.optional),
  parent_id: Schema.String.pipe(Schema.NullOr, Schema.optional),
  position: Schema.optional(Schema.Finite),
  permission_overwrites: PermissionOverwrite.pipe(Schema.Array, Schema.optional),
  thread_metadata: Schema.optional(ThreadMetadata),
});

const ThreadList = Schema.Struct({ threads: Schema.Array(Channel) });

const ArchivedThreadList = Schema.Struct({
  threads: Schema.Array(Channel),
  has_more: Schema.Boolean,
});

const Member = Schema.Struct({ roles: Schema.Array(Schema.String) });

export type DiscordGuild = typeof Guild.Type;
export type DiscordChannel = typeof Channel.Type;
export type DiscordMember = typeof Member.Type;

const decodeList = <Item extends Schema.Top>(item: Item) => {
  const decode = decodeBody(Schema.NullOr(Schema.Array(item)));
  return (
    raw: readonly Item["Encoded"][] | null,
  ): Effect.Effect<readonly Item["Type"][], never, Item["DecodingServices"]> =>
    decode(raw).pipe(Effect.map((items) => items ?? []));
};

const decodeGuilds = decodeList(PartialGuild);

const decodeUser = decodeBody(User);

const decodeGuild = decodeBody(Guild);

const decodeChannels = decodeList(Channel);

const decodeThreadList = decodeBody(ThreadList);

const decodeArchivedThreadList = decodeBody(ArchivedThreadList);

const decodeMessages = decodeList(DiscordMessageSchema);

const decodeMember = decodeBody(Member);

const decodeMessage = decodeBody(DiscordMessageSchema);

export const listBotGuilds: Effect.Effect<
  readonly Readonly<{ id: string }>[],
  DiscordRequestError
> = withDiscord((rest) => rest.listMyGuilds().pipe(Effect.flatMap(decodeGuilds)));

export const getBotUserId: Effect.Effect<string, DiscordRequestError> = withDiscord((rest) =>
  rest.getMyUser().pipe(
    Effect.flatMap(decodeUser),
    Effect.map(({ id }) => id),
  ),
);

export const leaveGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  withDiscord((rest) => rest.leaveGuild(guildId));

export const getGuild = (guildId: string): Effect.Effect<DiscordGuild, DiscordRequestError> =>
  withDiscord((rest) => rest.getGuild(guildId).pipe(Effect.flatMap(decodeGuild)));

export const listGuildChannels = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  withDiscord((rest) => rest.listGuildChannels(guildId).pipe(Effect.flatMap(decodeChannels)));

export const listActiveThreads = (
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

export const listArchivedThreads = (
  channelId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  listArchivedThreadsBefore(channelId, Option.none());

export type MessageSide = "after" | "before";

export type MessagePage =
  | Readonly<{ direction: "latest" }>
  | Readonly<{ direction: MessageSide; cursor: string }>;

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

export const listMessages: {
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

export const findMember: {
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

export const findMessage: {
  (
    messageId: string,
  ): (channelId: string) => Effect.Effect<Option.Option<DiscordMessage>, DiscordRequestError>;
  (
    channelId: string,
    messageId: string,
  ): Effect.Effect<Option.Option<DiscordMessage>, DiscordRequestError>;
} = Function.dual(DATA_FIRST_ARITY, findMessageDataFirst);
