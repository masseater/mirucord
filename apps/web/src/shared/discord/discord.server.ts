import { DiscordAPIError, REST } from "@discordjs/rest";
import { env } from "cloudflare:workers";
import { Routes } from "discord-api-types/v10";
import { Data, Effect, Option, Schema } from "effect";

const PAGE_SIZE = 100;
const NOT_FOUND = 404;

const PermissionOverwrite = Schema.Struct({
  id: Schema.String,
  type: Schema.Finite,
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

const Message = Schema.Struct({
  id: Schema.String,
  type: Schema.Finite,
  content: Schema.String,
  timestamp: Schema.String,
  edited_timestamp: Schema.NullOr(Schema.String),
  author: Schema.Struct({
    id: Schema.String,
    username: Schema.String,
    global_name: Schema.optional(Schema.NullOr(Schema.String)),
  }),
  attachments: Schema.Array(Schema.Struct({ filename: Schema.String, url: Schema.String })),
});

const Member = Schema.Struct({ roles: Schema.Array(Schema.String) });

type DiscordGuild = typeof Guild.Type;
type DiscordChannel = typeof Channel.Type;
type DiscordMessage = typeof Message.Type;
type DiscordMember = typeof Member.Type;

class DiscordRequestError extends Data.TaggedError("DiscordRequestError")<{
  readonly status: number;
  readonly cause: unknown;
}> {}

const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

const request = <S extends Schema.Top>(
  schema: S,
  load: () => Promise<unknown>,
): Effect.Effect<S["Type"], DiscordRequestError, S["DecodingServices"]> =>
  Effect.tryPromise({
    try: load,
    catch: (cause) =>
      new DiscordRequestError({
        status: cause instanceof DiscordAPIError ? cause.status : 0,
        cause,
      }),
  }).pipe(Effect.flatMap((body) => Schema.decodeUnknownEffect(schema)(body).pipe(Effect.orDie)));

const listBotGuilds = request(Schema.Array(PartialGuild), () => rest.get(Routes.userGuilds()));

const getGuild = (guildId: string): Effect.Effect<DiscordGuild, DiscordRequestError> =>
  request(Guild, () => rest.get(Routes.guild(guildId)));

const listGuildChannels = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  request(Schema.Array(Channel), () => rest.get(Routes.guildChannels(guildId)));

const listActiveThreads = (
  guildId: string,
): Effect.Effect<readonly DiscordChannel[], DiscordRequestError> =>
  request(ThreadList, () => rest.get(Routes.guildActiveThreads(guildId))).pipe(
    Effect.map(({ threads }) => threads),
  );

type MessagePage =
  | Readonly<{ direction: "latest" }>
  | Readonly<{ direction: "after" | "before"; cursor: string }>;

const listMessages = (
  channelId: string,
  page: MessagePage,
): Effect.Effect<readonly DiscordMessage[], DiscordRequestError> => {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (page.direction !== "latest") {
    query.set(page.direction, page.cursor);
  }
  return request(Schema.Array(Message), () =>
    rest.get(Routes.channelMessages(channelId), { query }),
  );
};

const findMember = (
  guildId: string,
  userId: string,
): Effect.Effect<Option.Option<DiscordMember>, DiscordRequestError> =>
  request(Member, () => rest.get(Routes.guildMember(guildId, userId))).pipe(
    Effect.map(Option.some),
    Effect.catchIf(
      (error) => error.status === NOT_FOUND,
      () => Effect.succeed(Option.none()),
    ),
  );

export {
  DiscordRequestError,
  findMember,
  getGuild,
  listActiveThreads,
  listBotGuilds,
  listGuildChannels,
  listMessages,
  PAGE_SIZE,
};
export type { DiscordChannel, DiscordGuild, DiscordMember, DiscordMessage };
