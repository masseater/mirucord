import { createMcpHandler } from "@modelcontextprotocol/server";
import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import { DateTime, Effect, Option, Record, Schema } from "effect";
import { http, HttpResponse } from "msw";

import { buildServer } from "#/features/mcp/api/tools.server";
import { createGuildKey, openGuildKey, sealMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, message, role } from "#/shared/db/index.server";

const USER = "900";
const OWNER = "901";
const GUILD_A = "100";
const GUILD_B = "200";
const GUILD_C = "300";
const MEMBER_ROLE = "150";
const STAFF_ROLE = "160";
const A_OPEN = "110";
const A_STAFF = "120";
const B_OPEN = "210";
const C_OPEN = "310";
const A_OPEN_MESSAGE = "1100";
const SAME_WORDS = "来週のオフ会の集合場所";
const NOTHING = "0";
const NOT_FOUND = 404;
const VIEW = PermissionFlagsBits.ViewChannel.toString();
const READ = (PermissionFlagsBits.ViewChannel + PermissionFlagsBits.ReadMessageHistory).toString();
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));
const SSE_DATA = "data: ";

type Overwrite = (typeof channel.$inferInsert)["permissionOverwrites"][number];
type ScenarioChannel = Readonly<{ id: string; overwrites: readonly Overwrite[] }>;
type ScenarioMessage = Readonly<{ id: string; channelId: string }>;
type ScenarioGuild = Readonly<{
  id: string;
  roles: Readonly<Record<string, string>>;
  channels: readonly ScenarioChannel[];
  messages: readonly ScenarioMessage[];
}>;

const STAFF_ONLY: readonly Overwrite[] = [
  { id: GUILD_A, type: OverwriteType.Role, allow: NOTHING, deny: VIEW },
  { id: STAFF_ROLE, type: OverwriteType.Role, allow: VIEW, deny: NOTHING },
];

const openGuild = (id: string, channelId: string, messageId: string): ScenarioGuild => ({
  id,
  roles: { [id]: READ },
  channels: [{ id: channelId, overwrites: [] }],
  messages: [{ id: messageId, channelId }],
});

const GUILDS: readonly ScenarioGuild[] = [
  {
    id: GUILD_A,
    roles: { [GUILD_A]: READ, [MEMBER_ROLE]: NOTHING, [STAFF_ROLE]: NOTHING },
    channels: [
      { id: A_OPEN, overwrites: [] },
      { id: A_STAFF, overwrites: STAFF_ONLY },
    ],
    messages: [
      { id: A_OPEN_MESSAGE, channelId: A_OPEN },
      { id: "1200", channelId: A_STAFF },
    ],
  },
  openGuild(GUILD_B, B_OPEN, "2100"),
  openGuild(GUILD_C, C_OPEN, "3100"),
];

const EVERY_MESSAGE_ID = GUILDS.flatMap(({ messages }) => messages.map(({ id }) => id));

const ROLES_BY_MEMBERSHIP: Readonly<Record<string, readonly string[]>> = {
  [`${GUILD_A}/${USER}`]: [MEMBER_ROLE],
  [`${GUILD_B}/${USER}`]: [],
};

const discordMembers = http.get<Readonly<{ guildId: string; userId: string }>>(
  "https://discord.com/api/v10/guilds/:guildId/members/:userId",
  ({ params: { guildId, userId } }) =>
    Option.match(Record.get(ROLES_BY_MEMBERSHIP, `${guildId}/${userId}`), {
      onNone: () => HttpResponse.json({ message: "Unknown Member" }, { status: NOT_FOUND }),
      onSome: (roles) => HttpResponse.json({ roles }),
    }),
);

const sealedRows = (
  seed: ScenarioGuild,
  key: CryptoKey,
): Effect.Effect<readonly (typeof message.$inferInsert)[]> =>
  Effect.forEach(
    seed.messages,
    ({ id, channelId }) =>
      sealMessage({ authorName: "someone", content: SAME_WORDS, attachments: [] }, key, {
        guildId: seed.id,
        channelId,
        messageId: id,
      }).pipe(
        Effect.map((sealed) => ({
          id,
          guildId: seed.id,
          channelId,
          authorId: OWNER,
          sealed,
          createdAt: SEEDED_AT,
        })),
      ),
    { concurrency: 1 },
  );

const seedGuild = (seed: ScenarioGuild): Effect.Effect<void> =>
  Effect.gen(function* seedRows() {
    const wrappedKey = yield* createGuildKey;
    yield* Effect.promise(() =>
      db.insert(guild).values({
        id: seed.id,
        name: `guild ${seed.id}`,
        ownerId: OWNER,
        wrappedKey,
        joinedAt: SEEDED_AT,
      }),
    );
    yield* Effect.promise(() =>
      db.insert(role).values(
        Object.entries(seed.roles).map(([id, permissions]) => ({
          id,
          guildId: seed.id,
          permissions,
        })),
      ),
    );
    yield* Effect.promise(() =>
      db.insert(channel).values(
        seed.channels.map(({ id, overwrites }) => ({
          id,
          guildId: seed.id,
          name: `channel ${id}`,
          type: ChannelType.GuildText,
          permissionOverwrites: overwrites,
        })),
      ),
    );
    const rows = yield* sealedRows(seed, yield* openGuildKey(wrappedKey));
    yield* Effect.promise(() => db.insert(message).values([...rows]));
  });

const seedScenario = (): Promise<void> =>
  Effect.runPromise(Effect.forEach(GUILDS, seedGuild, { discard: true }));

const TextContent = Schema.Struct({ text: Schema.String });
const ToolResult = Schema.Struct({ content: Schema.Tuple([TextContent]), isError: Schema.Boolean });
const ToolResponse = Schema.fromJsonString(Schema.Struct({ result: ToolResult }));
const IdList = Schema.fromJsonString(Schema.Array(Schema.Struct({ id: Schema.String })));
const ToolArguments = Schema.Record(Schema.String, Schema.String);
const ToolParams = Schema.Struct({ name: Schema.String, arguments: ToolArguments });
const ToolCall = Schema.fromJsonString(
  Schema.Struct({
    jsonrpc: Schema.String,
    id: Schema.Finite,
    method: Schema.String,
    params: ToolParams,
  }),
);
const encodeToolCall = Schema.encodeEffect(ToolCall);
const decodeToolResponse = Schema.decodeEffect(ToolResponse);
const decodeIds = Schema.decodeEffect(IdList);

type ToolOutcome = Readonly<{ text: string; isError: boolean }>;

const requestOf = (body: string): Request =>
  new Request("https://mirucord.test/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body,
  });

const sseData = (body: string): string =>
  body
    .split("\n")
    .filter((line) => line.startsWith(SSE_DATA))
    .map((line) => line.slice(SSE_DATA.length))
    .join("");

const callTool = ({
  name,
  args,
}: Readonly<{
  name: string;
  args: Readonly<Record<string, string>>;
}>): Effect.Effect<ToolOutcome> =>
  Effect.gen(function* call() {
    const body = yield* encodeToolCall({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    });
    const handler = createMcpHandler(() => buildServer(USER));
    const response = yield* Effect.promise(() => handler.fetch(requestOf(body)));
    const text = yield* Effect.promise(() => response.text());
    const {
      result: {
        content: [{ text: answer }],
        isError,
      },
    } = yield* decodeToolResponse(sseData(text));
    return { text: answer, isError };
  }).pipe(Effect.orDie);

const idsOf = (outcome: Effect.Effect<ToolOutcome>): Effect.Effect<readonly string[]> =>
  outcome.pipe(
    Effect.flatMap(({ text }) => decodeIds(text)),
    Effect.map((items) => items.map(({ id }) => id)),
    Effect.orDie,
  );

export {
  A_OPEN,
  A_OPEN_MESSAGE,
  A_STAFF,
  B_OPEN,
  callTool,
  discordMembers,
  EVERY_MESSAGE_ID,
  GUILD_A,
  GUILD_B,
  GUILD_C,
  idsOf,
  SAME_WORDS,
  seedScenario,
  USER,
};
export type { ToolOutcome };
