import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { Effect, Option } from "effect";
import { afterAll, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import {
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
} from "./__tests__/scenario";
import { readMessages } from "./messages.server";
import { resolveScope } from "./scope.server";

const DEFAULT_LIMIT = 20;
const READ_LIMIT = 50;
const UNIT = 1;
const EMBEDDING = [UNIT];
const REFUSED = { text: "Channel not found", isError: true };

const readPastChannelCheck = (channelId: string): Effect.Effect<readonly string[]> =>
  resolveScope({ guildId: GUILD_A, discordUserId: USER }).pipe(
    Effect.map(Option.getOrThrow),
    Effect.flatMap((scope) =>
      readMessages({ scope, channelId, before: Option.none(), limit: READ_LIMIT }),
    ),
    Effect.map((views) => views.map(({ id }) => id)),
    Effect.orDie,
  );

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedScenario();
});

afterAll(() => {
  network.disable();
});

beforeEach(() => {
  vi.spyOn(env.AI, "run").mockResolvedValue({ data: [EMBEDDING] });
  vi.spyOn(env.MESSAGES, "query").mockResolvedValue({
    matches: EVERY_MESSAGE_ID.map((id) => ({ id, score: 1 })),
    count: EVERY_MESSAGE_ID.length,
  });
});

it.effect("lists only the servers the user belongs to", () =>
  Effect.gen(function* listServers() {
    const ids = yield* idsOf(callTool({ name: "list_servers", args: {} }));
    expect(ids).toStrictEqual([GUILD_A, GUILD_B]);
  }),
);

it.effect("lists only the channels the user can read", () =>
  Effect.gen(function* listChannels() {
    const ids = yield* idsOf(callTool({ name: "list_channels", args: { serverId: GUILD_A } }));
    expect(ids).toStrictEqual([A_OPEN]);
  }),
);

it.effect("asks the vector index only for the requested server and its readable channels", () =>
  Effect.gen(function* searchFilter() {
    const query = vi.spyOn(env.MESSAGES, "query");
    yield* callTool({ name: "search_messages", args: { serverId: GUILD_A, query: SAME_WORDS } });
    expect(query).toHaveBeenCalledWith(expect.anything(), {
      topK: DEFAULT_LIMIT,
      returnMetadata: "none",
      filter: { guildId: GUILD_A, channelId: { $in: [A_OPEN] } },
    });
  }),
);

it.effect("drops other servers and unreadable channels even if the index returns them", () =>
  Effect.gen(function* search() {
    const ids = yield* idsOf(
      callTool({ name: "search_messages", args: { serverId: GUILD_A, query: SAME_WORDS } }),
    );
    expect(ids).toStrictEqual([A_OPEN_MESSAGE]);
  }),
);

it.effect("refuses to search an unreadable channel or one from another server", () =>
  Effect.gen(function* searchRefused() {
    const outcomes = yield* Effect.all([
      callTool({
        name: "search_messages",
        args: { serverId: GUILD_A, query: SAME_WORDS, channelId: A_STAFF },
      }),
      callTool({
        name: "search_messages",
        args: { serverId: GUILD_A, query: SAME_WORDS, channelId: B_OPEN },
      }),
    ]);
    expect(outcomes).toStrictEqual([REFUSED, REFUSED]);
  }),
);

it.effect("refuses to read an unreadable channel or one from another server", () =>
  Effect.gen(function* readRefused() {
    const outcomes = yield* Effect.all([
      callTool({ name: "read_messages", args: { serverId: GUILD_A, channelId: A_STAFF } }),
      callTool({ name: "read_messages", args: { serverId: GUILD_A, channelId: B_OPEN } }),
    ]);
    expect(outcomes).toStrictEqual([REFUSED, REFUSED]);
  }),
);

it.effect("reads a readable channel of the requested server", () =>
  Effect.gen(function* read() {
    const ids = yield* idsOf(
      callTool({ name: "read_messages", args: { serverId: GUILD_A, channelId: A_OPEN } }),
    );
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
    const outcome = yield* callTool({
      name: "search_messages",
      args: { serverId: GUILD_C, query: SAME_WORDS },
    });
    expect(outcome).toStrictEqual({ text: "Server not found", isError: true });
  }),
);
