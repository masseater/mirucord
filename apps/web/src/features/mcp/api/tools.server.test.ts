import { it } from "@effect/vitest";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import { Effect, Option, Schema } from "effect";
import { afterEach, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import { answerAsDiscord, matchesOf, seedGuilds } from "#/shared/__mocks__";
import type { Memberships, SeedGuild } from "#/shared/__mocks__";

import { readMessages } from "./messages.server";
import { resolveScope } from "./scope.server";
import { buildServer } from "./tools.server";

vi.mock("cloudflare:workers", () => import("#/shared/__mocks__/index.workers"));
vi.mock("#/shared/db/client.server");

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
const VIEW = PermissionFlagsBits.ViewChannel.toString();
const READ = (PermissionFlagsBits.ViewChannel + PermissionFlagsBits.ReadMessageHistory).toString();
const DEFAULT_LIMIT = 20;
const READ_LIMIT = 50;
const SSE_DATA = "data: ";
const REFUSED = { text: "Channel not found", isError: true };

const MEMBERSHIPS: Memberships = {
  [GUILD_A]: { [USER]: [MEMBER_ROLE] },
  [GUILD_B]: { [USER]: [] },
};

const openGuild = (id: string, channelId: string, messageId: string): SeedGuild => ({
  id,
  ownerId: OWNER,
  consent: "granted",
  rolePermissions: { [id]: READ },
  channels: [{ id: channelId, botAccess: "readable", permissionOverwrites: [] }],
  messages: [{ id: messageId, channelId, content: SAME_WORDS }],
});

const GUILDS: readonly SeedGuild[] = [
  {
    id: GUILD_A,
    ownerId: OWNER,
    consent: "granted",
    rolePermissions: { [GUILD_A]: READ, [MEMBER_ROLE]: NOTHING, [STAFF_ROLE]: NOTHING },
    channels: [
      { id: A_OPEN, botAccess: "readable", permissionOverwrites: [] },
      {
        id: A_STAFF,
        botAccess: "readable",
        permissionOverwrites: [
          { id: GUILD_A, type: OverwriteType.Role, allow: NOTHING, deny: VIEW },
          { id: STAFF_ROLE, type: OverwriteType.Role, allow: VIEW, deny: NOTHING },
        ],
      },
    ],
    messages: [
      { id: A_OPEN_MESSAGE, channelId: A_OPEN, content: SAME_WORDS },
      { id: "1200", channelId: A_STAFF, content: SAME_WORDS },
    ],
  },
  openGuild(GUILD_B, B_OPEN, "2100"),
  openGuild(GUILD_C, C_OPEN, "3100"),
];

const EVERY_MESSAGE = GUILDS.flatMap(({ messages }) => messages);

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

const callTool = (
  name: string,
  args: Readonly<Record<string, string>>,
): Effect.Effect<ToolOutcome> =>
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

const readPastChannelCheck = (channelId: string): Effect.Effect<readonly string[]> =>
  resolveScope({ guildId: GUILD_A, discordUserId: USER }).pipe(
    Effect.map(Option.getOrThrow),
    Effect.flatMap((scope) =>
      readMessages({ scope, channelId, before: Option.none(), limit: READ_LIMIT }),
    ),
    Effect.map((views) => views.map(({ id }) => id)),
    Effect.orDie,
  );

beforeAll(() => seedGuilds(GUILDS));

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) =>
    Promise.resolve(answerAsDiscord({ url: new Request(input).url, memberships: MEMBERSHIPS })),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

it.effect("lists only the servers the user belongs to", () =>
  Effect.gen(function* listServers() {
    const ids = yield* idsOf(callTool("list_servers", {}));
    expect(ids).toStrictEqual([GUILD_A, GUILD_B]);
  }),
);

it.effect("lists only the channels the user can read", () =>
  Effect.gen(function* listChannels() {
    const ids = yield* idsOf(callTool("list_channels", { serverId: GUILD_A }));
    expect(ids).toStrictEqual([A_OPEN]);
  }),
);

it.effect("finds the same words only in readable channels of the requested server", () =>
  Effect.gen(function* search() {
    const ids = yield* idsOf(callTool("search_messages", { serverId: GUILD_A, query: SAME_WORDS }));
    expect(ids).toStrictEqual([A_OPEN_MESSAGE]);
  }),
);

it.effect("asks the vector index only for the requested server and its readable channels", () =>
  Effect.gen(function* searchFilter() {
    const query = vi.spyOn(env.MESSAGES, "query");
    yield* callTool("search_messages", { serverId: GUILD_A, query: SAME_WORDS });
    expect(query).toHaveBeenCalledWith(expect.anything(), {
      topK: DEFAULT_LIMIT,
      returnMetadata: "none",
      filter: { guildId: GUILD_A, channelId: { $in: [A_OPEN] } },
    });
  }),
);

it.effect("drops other servers and unreadable channels even if the index returns them", () =>
  Effect.gen(function* leakyIndex() {
    vi.spyOn(env.MESSAGES, "query").mockResolvedValue(matchesOf(EVERY_MESSAGE));
    const ids = yield* idsOf(callTool("search_messages", { serverId: GUILD_A, query: SAME_WORDS }));
    expect(ids).toStrictEqual([A_OPEN_MESSAGE]);
  }),
);

it.effect("refuses to search an unreadable channel or one from another server", () =>
  Effect.gen(function* searchRefused() {
    const outcomes = yield* Effect.all([
      callTool("search_messages", { serverId: GUILD_A, query: SAME_WORDS, channelId: A_STAFF }),
      callTool("search_messages", { serverId: GUILD_A, query: SAME_WORDS, channelId: B_OPEN }),
    ]);
    expect(outcomes).toStrictEqual([REFUSED, REFUSED]);
  }),
);

it.effect("refuses to read an unreadable channel or one from another server", () =>
  Effect.gen(function* readRefused() {
    const outcomes = yield* Effect.all([
      callTool("read_messages", { serverId: GUILD_A, channelId: A_STAFF }),
      callTool("read_messages", { serverId: GUILD_A, channelId: B_OPEN }),
    ]);
    expect(outcomes).toStrictEqual([REFUSED, REFUSED]);
  }),
);

it.effect("reads a readable channel of the requested server", () =>
  Effect.gen(function* read() {
    const ids = yield* idsOf(callTool("read_messages", { serverId: GUILD_A, channelId: A_OPEN }));
    expect(ids).toStrictEqual([A_OPEN_MESSAGE]);
  }),
);

it.effect("keeps unreadable and foreign messages out of a read past the channel check", () =>
  Effect.gen(function* readPastCheck() {
    const reads = yield* Effect.all([
      readPastChannelCheck(A_OPEN),
      readPastChannelCheck(A_STAFF),
      readPastChannelCheck(B_OPEN),
    ]);
    expect(reads).toStrictEqual([[A_OPEN_MESSAGE], [], []]);
  }),
);

it.effect("treats a server the user does not belong to as missing", () =>
  Effect.gen(function* foreignServer() {
    const outcome = yield* callTool("search_messages", { serverId: GUILD_C, query: SAME_WORDS });
    expect(outcome).toStrictEqual({ text: "Server not found", isError: true });
  }),
);
