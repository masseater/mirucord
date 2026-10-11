import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { Array, Effect, Option, Schema } from "effect";
import { afterAll, beforeAll, beforeEach, expect, vi } from "vite-plus/test";

import {
  A_OPEN,
  A_OPEN_MESSAGE,
  A_PRIVATE_THREAD,
  A_STAFF,
  A_STAFF_THREAD,
  B_OPEN,
  discordMembers,
  EVERY_MESSAGE_ID,
  GUILD_A,
  GUILD_B,
  GUILD_C,
  GUILD_D,
  D_OPEN,
  SAME_WORDS,
  seedScenario,
  USER,
} from "./__tests__/scenario";
import { callTool, idsOf, readIngestOf } from "./__tests__/tool-call";
import type { ToolOutcome } from "./__tests__/tool-call";
import { readMessages } from "./messages.server";
import { resolveScope } from "./scope.server";

const DEFAULT_LIMIT = 20;
const READ_LIMIT = 50;
const UNIT = 1;
const EMBEDDING = [UNIT];
const REFUSED = { text: "Channel not found", isError: true, structured: Option.none() };

const readPastChannelCheck = (
  channelId: string,
  guildId = GUILD_A,
): Effect.Effect<readonly string[]> =>
  resolveScope({ guildId, discordUserId: USER }).pipe(
    Effect.map(Option.getOrThrow),
    Effect.flatMap((scope) =>
      readMessages({ scope, channelId, before: Option.none(), limit: READ_LIMIT }),
    ),
    Effect.map((views) => views.map(({ id }) => id)),
    Effect.orDie,
  );

const PendingChannel = Schema.Struct({ channelId: Schema.String });
const SearchIngest = Schema.Struct({ notFullyIngested: Schema.Array(PendingChannel) });
const decodeSearchIngest = Schema.decodeUnknownEffect(SearchIngest);
const decodeJsonText = Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown));

const notFullyIngestedOf = (
  outcome: Effect.Effect<ToolOutcome>,
): Effect.Effect<readonly string[]> =>
  outcome.pipe(
    Effect.flatMap(({ structured }) => decodeSearchIngest(Option.getOrUndefined(structured))),
    Effect.map(({ notFullyIngested }) => notFullyIngested.map(({ channelId }) => channelId)),
    Effect.orDie,
  );

const FoundIds = Schema.Array(Schema.Struct({ id: Schema.String }));
const Found = Schema.Struct({ total: Schema.Finite, messages: FoundIds });
const decodeFound = Schema.decodeUnknownEffect(Found);

const foundOf = (
  outcome: Effect.Effect<ToolOutcome>,
): Effect.Effect<Readonly<{ total: number; ids: readonly string[] }>> =>
  outcome.pipe(
    Effect.flatMap(({ structured }) => decodeFound(Option.getOrUndefined(structured))),
    Effect.map(({ total, messages }) => ({ total, ids: messages.map(({ id }) => id) })),
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
    const ids = yield* idsOf("servers")(callTool({ name: "list_servers", args: {} }));
    expect(ids).toStrictEqual([GUILD_A, GUILD_B, GUILD_D]);
  }),
);

it.effect("lists only the channels the user can read", () =>
  Effect.gen(function* listChannels() {
    const ids = yield* idsOf("channels")(
      callTool({ name: "list_channels", args: { serverId: GUILD_A } }),
    );
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
    const ids = yield* idsOf("messages")(
      callTool({ name: "search_messages", args: { serverId: GUILD_A, query: SAME_WORDS } }),
    );
    expect(ids).toStrictEqual([A_OPEN_MESSAGE]);
  }),
);

it.effect("does not report a category as a channel still being stored", () =>
  Effect.gen(function* searchIngest() {
    const pending = yield* notFullyIngestedOf(
      callTool({ name: "search_messages", args: { serverId: GUILD_A, query: SAME_WORDS } }),
    );
    expect(pending).toStrictEqual([]);
  }),
);

it.effect("refuses to search an unreadable channel, its threads or one from another server", () =>
  Effect.gen(function* searchRefused() {
    const outcomes = yield* Effect.forEach(
      ["search_messages", "find_messages"].flatMap((name) =>
        [A_STAFF, A_STAFF_THREAD, A_PRIVATE_THREAD, B_OPEN].map((channelId) => ({
          name,
          args: { serverId: GUILD_A, query: SAME_WORDS, channelId },
        })),
      ),
      callTool,
    );
    expect(outcomes).toStrictEqual(Array.replicate(REFUSED, outcomes.length));
  }),
);

it.effect("searches a readable channel without its private threads", () =>
  Effect.gen(function* searchChannelFilter() {
    const query = vi.spyOn(env.MESSAGES, "query");
    yield* callTool({
      name: "search_messages",
      args: { serverId: GUILD_A, query: SAME_WORDS, channelId: A_OPEN },
    });
    expect(query).toHaveBeenCalledWith(expect.anything(), {
      topK: DEFAULT_LIMIT,
      returnMetadata: "none",
      filter: { guildId: GUILD_A, channelId: { $in: [A_OPEN] } },
    });
  }),
);

it.effect("counts keyword matches only in the channels the user can read", () =>
  Effect.gen(function* find() {
    const found = yield* Effect.all([
      foundOf(callTool({ name: "find_messages", args: { serverId: GUILD_A, query: "オフ会" } })),
      foundOf(callTool({ name: "find_messages", args: { serverId: GUILD_A, query: "飲み会" } })),
    ]);
    expect(found).toStrictEqual([
      { total: 1, ids: [A_OPEN_MESSAGE] },
      { total: 0, ids: [] },
    ]);
  }),
);

it.effect("refuses to read an unreadable channel, its threads or one from another server", () =>
  Effect.gen(function* readRefused() {
    const outcomes = yield* Effect.forEach(
      [A_STAFF, A_STAFF_THREAD, A_PRIVATE_THREAD, B_OPEN],
      (channelId) => callTool({ name: "read_messages", args: { serverId: GUILD_A, channelId } }),
    );
    expect(outcomes).toStrictEqual([REFUSED, REFUSED, REFUSED, REFUSED]);
  }),
);

it.effect("returns no messages from a server whose admin has not consented or withdrew", () =>
  Effect.gen(function* withoutConsent() {
    const found = yield* Effect.forEach([GUILD_B, GUILD_D], (serverId) =>
      idsOf("messages")(
        callTool({ name: "search_messages", args: { serverId, query: SAME_WORDS } }),
      ),
    );
    const read = yield* Effect.forEach(
      [
        { serverId: GUILD_B, channelId: B_OPEN },
        { serverId: GUILD_D, channelId: D_OPEN },
      ],
      (args) => idsOf("messages")(callTool({ name: "read_messages", args })),
    );
    const counted = yield* Effect.forEach([GUILD_B, GUILD_D], (serverId) =>
      foundOf(callTool({ name: "find_messages", args: { serverId, query: "オフ会" } })),
    );
    expect([...found, ...read]).toStrictEqual([[], [], [], []]);
    expect(counted).toStrictEqual([
      { total: 0, ids: [] },
      { total: 0, ids: [] },
    ]);
  }),
);

it.effect("reads a readable channel of the requested server", () =>
  Effect.gen(function* read() {
    const ids = yield* idsOf("messages")(
      callTool({ name: "read_messages", args: { serverId: GUILD_A, channelId: A_OPEN } }),
    );
    expect(ids).toStrictEqual([A_OPEN_MESSAGE]);
  }),
);

it.effect("tells a channel without consent apart from one that has no messages", () =>
  Effect.gen(function* readIngest() {
    const ingests = yield* Effect.all([
      readIngestOf(
        callTool({ name: "read_messages", args: { serverId: GUILD_A, channelId: A_OPEN } }),
      ),
      readIngestOf(
        callTool({ name: "read_messages", args: { serverId: GUILD_B, channelId: B_OPEN } }),
      ),
      readIngestOf(
        callTool({ name: "read_messages", args: { serverId: GUILD_D, channelId: D_OPEN } }),
      ),
    ]);
    expect(ingests).toStrictEqual(["done", "notConsented", "notConsented"]);
  }),
);

it.effect("keeps unreadable and foreign messages out of a read past the channel check", () =>
  Effect.gen(function* readPastCheck() {
    const reads = yield* Effect.all([
      readPastChannelCheck(A_OPEN),
      readPastChannelCheck(A_STAFF),
      readPastChannelCheck(A_STAFF_THREAD),
      readPastChannelCheck(A_PRIVATE_THREAD),
      readPastChannelCheck(B_OPEN),
      readPastChannelCheck(B_OPEN, GUILD_B),
    ]);
    expect(reads).toStrictEqual([[A_OPEN_MESSAGE], [], [], [], [], []]);
  }),
);

it.effect("treats a server the user does not belong to as missing", () =>
  Effect.gen(function* foreignServer() {
    const outcome = yield* callTool({
      name: "search_messages",
      args: { serverId: GUILD_C, query: SAME_WORDS },
    });
    expect(outcome).toStrictEqual({
      text: "Server not found",
      isError: true,
      structured: Option.none(),
    });
  }),
);

it.effect("mirrors the structured result as JSON text for clients that read only text", () =>
  Effect.gen(function* textFallback() {
    const { text, structured } = yield* callTool({
      name: "read_messages",
      args: { serverId: GUILD_A, channelId: A_OPEN },
    });
    const parsed = yield* decodeJsonText(text);
    expect(Option.some(parsed)).toStrictEqual(structured);
  }),
);
