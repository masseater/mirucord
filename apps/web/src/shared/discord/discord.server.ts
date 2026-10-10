import { DiscordAPIError, REST, RequestMethod } from "@discordjs/rest";
import { env } from "cloudflare:workers";
import { OverwriteType, Routes } from "discord-api-types/v10";
import { Array, Data, Effect, Function, Option, Schema } from "effect";

const DATA_FIRST_ARITY = 2;

const PAGE_SIZE = 100;
const NOT_FOUND = 404;
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

const Channel = Schema.Struct({
  id: Schema.String,
  type: Schema.Finite,
  name: Schema.optional(Schema.String),
  parent_id: Schema.optional(Schema.NullOr(Schema.String)),
  permission_overwrites: Schema.optional(Schema.Array(PermissionOverwrite)),
});

const ThreadList = Schema.Struct({ threads: Schema.Array(Channel) });

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

const isDiscordApiError = (cause: unknown): cause is DiscordAPIError =>
  cause instanceof DiscordAPIError;

const rest = new REST({ version: "10", hashSweepInterval: 0, handlerSweepInterval: 0 }).setToken(
  env.DISCORD_BOT_TOKEN,
);

const callDiscord = <Body extends Schema.Top>(
  schema: Body,
  load: () => Promise<unknown>,
): Effect.Effect<Body["Type"], DiscordRequestError, Body["DecodingServices"]> =>
  Effect.tryPromise({
    try: load,
    catch: (cause) =>
      new DiscordRequestError({
        status: Option.liftPredicate(cause, isDiscordApiError).pipe(
          Option.map(({ status }) => status),
        ),
        cause,
      }),
  }).pipe(Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body).pipe(Effect.orDie)));

const listBotGuilds = callDiscord(Schema.Array(PartialGuild), () => rest.get(Routes.userGuilds()));

const leaveGuild = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  Effect.asVoid(
    callDiscord(Schema.Unknown, () =>
      rest.request({ method: RequestMethod.Delete, fullRoute: Routes.userGuild(guildId) }),
    ),
  );

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
      rest.post(Routes.webhook(webhookId, token), {
        body: { content, allowed_mentions: { parse: [] } },
        auth: false,
      }),
    ),
  );
};

const getGuild = (guildId: string): Effect.Effect<DiscordGuild, DiscordRequestError> =>
  callDiscord(Guild, () => rest.get(Routes.guild(guildId)));

const listGuildChannels = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  callDiscord(Schema.Array(Channel), () => rest.get(Routes.guildChannels(guildId)));

const listActiveThreads = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  callDiscord(ThreadList, () => rest.get(Routes.guildActiveThreads(guildId))).pipe(
    Effect.map(({ threads }) => threads),
  );

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
    rest.get(Routes.channelMessages(channelId), { query }),
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
  callDiscord(Member, () => rest.get(Routes.guildMember(guildId, userId))).pipe(
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
  findMember,
  getGuild,
  leaveGuild,
  listActiveThreads,
  listBotGuilds,
  listGuildChannels,
  listMessages,
  PAGE_SIZE,
  postWebhookMessage,
};
export type { DiscordChannel, DiscordGuild, DiscordMember, DiscordMessage, MessagePage };
