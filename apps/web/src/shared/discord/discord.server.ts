import { createRestManager } from "@discordeno/rest";
import type { RequestMethods } from "@discordeno/rest";
import { env } from "cloudflare:workers";
import { OverwriteType, Routes } from "discord-api-types/v10";
import { Array, Data, Effect, Function, Option, Schema } from "effect";

const DATA_FIRST_ARITY = 2;

const PAGE_SIZE = 100;
const NOT_FOUND = 404;
const FORBIDDEN = 403;
const WEBHOOK_PATH_PARTS = 2;

const PermissionOverwrite = Schema.Struct({
  id: Schema.String,
  type: Schema.Enum(OverwriteType),
  allow: Schema.String,
  deny: Schema.String,
});

const Guild = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  owner_id: Schema.String,
  roles: Schema.Array(Schema.Struct({ id: Schema.String, permissions: Schema.String })),
});

const PartialGuild = Schema.Struct({ id: Schema.String });

const User = Schema.Struct({ id: Schema.String });

const Channel = Schema.Struct({
  id: Schema.String,
  type: Schema.Finite,
  name: Schema.optional(Schema.String),
  parent_id: Schema.optional(Schema.NullOr(Schema.String)),
  position: Schema.optional(Schema.Finite),
  permission_overwrites: Schema.optional(Schema.Array(PermissionOverwrite)),
  thread_metadata: Schema.optional(Schema.Struct({ archive_timestamp: Schema.String })),
});

const ThreadList = Schema.Struct({ threads: Schema.Array(Channel) });

const ArchivedThreadList = Schema.Struct({
  threads: Schema.Array(Channel),
  has_more: Schema.Boolean,
});

const Attachment = Schema.Struct({ filename: Schema.String, url: Schema.String });

const Author = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.optional(Schema.NullOr(Schema.String)),
});

const Message = Schema.Struct({
  id: Schema.String,
  type: Schema.Finite,
  content: Schema.String,
  timestamp: Schema.DateTimeUtcFromString,
  edited_timestamp: Schema.NullOr(Schema.DateTimeUtcFromString),
  author: Author,
  attachments: Schema.Array(Attachment),
});

const Member = Schema.Struct({ roles: Schema.Array(Schema.String) });

type DiscordGuild = typeof Guild.Type;
type DiscordChannel = typeof Channel.Type;
type DiscordMessage = typeof Message.Type;
type DiscordMember = typeof Member.Type;

class DiscordRequestError extends Data.TaggedError("DiscordRequestError")<{
  readonly status: Option.Option<number>;
  readonly cause: unknown;
}> {}

const RequestFailure = Schema.Struct({ cause: Schema.Struct({ status: Schema.Finite }) });
const decodeRequestFailure = Schema.decodeUnknownOption(RequestFailure);

const rest = createRestManager({ token: env.DISCORD_BOT_TOKEN });

const send = (
  method: RequestMethods,
  route: string,
  options?: Readonly<{ body: unknown; unauthorized: boolean }>,
): Promise<unknown> => rest.makeRequest(method, route, { ...options, runThroughQueue: false });

const callDiscord = <Body extends Schema.Top>(
  schema: Body,
  load: () => Promise<unknown>,
): Effect.Effect<Body["Type"], DiscordRequestError, Body["DecodingServices"]> =>
  Effect.tryPromise({
    try: load,
    catch: (cause) =>
      new DiscordRequestError({
        status: decodeRequestFailure(cause).pipe(Option.map((failure) => failure.cause.status)),
        cause,
      }),
  }).pipe(Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body).pipe(Effect.orDie)));

const listBotGuilds = callDiscord(Schema.Array(PartialGuild), () =>
  send("GET", Routes.userGuilds()),
);

const getBotUserId: Effect.Effect<string, DiscordRequestError> = callDiscord(User, () =>
  send("GET", Routes.user()),
).pipe(Effect.map(({ id }) => id));

const leaveGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  Effect.asVoid(callDiscord(Schema.Unknown, () => send("DELETE", Routes.userGuild(guildId))));

const postWebhookMessage = ({
  webhookUrl,
  content,
}: Readonly<{ webhookUrl: string; content: string }>): Effect.Effect<void, DiscordRequestError> => {
  const [webhookId = "", token = ""] = Array.takeRight(
    new URL(webhookUrl).pathname.split("/"),
    WEBHOOK_PATH_PARTS,
  );
  return Effect.asVoid(
    callDiscord(Schema.Unknown, () =>
      send("POST", Routes.webhook(webhookId, token), {
        body: { content, allowed_mentions: { parse: [] } },
        unauthorized: true,
      }),
    ),
  );
};

const postChannelMessage = ({
  channelId,
  content,
}: Readonly<{ channelId: string; content: string }>): Effect.Effect<void, DiscordRequestError> =>
  Effect.asVoid(
    callDiscord(Schema.Unknown, () =>
      send("POST", Routes.channelMessages(channelId), {
        body: { content, allowed_mentions: { parse: [] } },
        unauthorized: false,
      }),
    ),
  );

const getGuild = (guildId: string): Effect.Effect<DiscordGuild, DiscordRequestError> =>
  callDiscord(Guild, () => send("GET", Routes.guild(guildId)));

const listGuildChannels = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  callDiscord(Schema.Array(Channel), () => send("GET", Routes.guildChannels(guildId)));

const listActiveThreads = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  callDiscord(ThreadList, () => send("GET", Routes.guildActiveThreads(guildId))).pipe(
    Effect.map(({ threads }) => threads),
  );

const listArchivedThreadsBefore = (
  channelId: string,
  before: Option.Option<string>,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> => {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (Option.isSome(before)) {
    query.set("before", before.value);
  }
  return callDiscord(ArchivedThreadList, () =>
    send("GET", `${Routes.channelThreads(channelId, "public")}?${query.toString()}`),
  ).pipe(
    Effect.flatMap(({ threads, has_more }) => {
      const next = Array.last(threads).pipe(
        Option.flatMap(({ thread_metadata }) => Option.fromUndefinedOr(thread_metadata)),
        Option.map(({ archive_timestamp }) => archive_timestamp),
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
};

const listArchivedThreads = (
  channelId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  listArchivedThreadsBefore(channelId, Option.none());

type MessagePage =
  | Readonly<{ direction: "latest" }>
  | Readonly<{ direction: "after" | "before"; cursor: string }>;

const listMessagesDataFirst = (
  channelId: string,
  page: MessagePage,
): Effect.Effect<readonly DiscordMessage[], DiscordRequestError> => {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (page.direction !== "latest") {
    query.set(page.direction, page.cursor);
  }
  return callDiscord(Schema.Array(Message), () =>
    send("GET", `${Routes.channelMessages(channelId)}?${query.toString()}`),
  );
};

const listMessages: {
  (
    page: MessagePage,
  ): (channelId: string) => Effect.Effect<readonly DiscordMessage[], DiscordRequestError>;
  (
    channelId: string,
    page: MessagePage,
  ): Effect.Effect<readonly DiscordMessage[], DiscordRequestError>;
} = Function.dual(DATA_FIRST_ARITY, listMessagesDataFirst);

const findMemberDataFirst = (
  guildId: string,
  userId: string,
): Effect.Effect<Option.Option<DiscordMember>, DiscordRequestError> =>
  callDiscord(Member, () => send("GET", Routes.guildMember(guildId, userId))).pipe(
    Effect.asSome,
    Effect.catchIf(
      (error) => Option.contains(error.status, NOT_FOUND),
      () => Effect.succeedNone,
    ),
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

export {
  DiscordRequestError,
  FORBIDDEN,
  findMember,
  getBotUserId,
  getGuild,
  leaveGuild,
  listActiveThreads,
  listArchivedThreads,
  listBotGuilds,
  listGuildChannels,
  listMessages,
  PAGE_SIZE,
  postChannelMessage,
  postWebhookMessage,
};
export type { DiscordChannel, DiscordGuild, DiscordMember, DiscordMessage, MessagePage };
