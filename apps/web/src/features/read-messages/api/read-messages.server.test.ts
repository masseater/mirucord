import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { Array, Effect, Option, pipe, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { resolveScope } from "#/entities/scope/index.server";
import {
  A_OPEN,
  A_OPEN_MESSAGE,
  A_PRIVATE_THREAD,
  A_STAFF,
  A_STAFF_THREAD,
  B_OPEN,
  discordMembers,
  GUILD_A,
  GUILD_B,
  OWNER,
  seedScenario,
  USER,
  userToolCaller,
} from "#/entities/scope/index.test.support";
import type { ToolOutcome } from "#/shared/mcp/index.test.support";

import { readMessages, registerReadMessages } from "./read-messages.server";

const callTool = userToolCaller([registerReadMessages]);
const READ_LIMIT = 50;

const AuthoredMessage = Schema.Struct({ id: Schema.String, authorId: Schema.String });
const Authored = Schema.Struct({ messages: Schema.Array(AuthoredMessage) });
const decodeAuthored = Schema.decodeUnknownEffect(Authored);

const structuredOf = (outcome: Effect.Effect<ToolOutcome>): Effect.Effect<unknown> =>
  outcome.pipe(Effect.map(({ structured }) => Option.getOrUndefined(structured)));

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedScenario();
});

afterAll(() => {
  network.disable();
});

it.effect("reads what one person wrote only in the channels the user can read", () =>
  Effect.gen(function* readAuthor() {
    const { messages } = yield* structuredOf(
      callTool({ name: "read_messages", args: { serverId: GUILD_A, authorId: OWNER } }),
    ).pipe(Effect.flatMap(decodeAuthored), Effect.orDie);
    expect(messages).toStrictEqual([{ id: A_OPEN_MESSAGE, authorId: OWNER }]);
  }),
);

it.effect("refuses to read without a channel or an author", () =>
  Effect.gen(function* readNothing() {
    const { isError } = yield* callTool({ name: "read_messages", args: { serverId: GUILD_A } });
    expect(isError).toBe(true);
  }),
);

const readPastChannelCheck = (
  channelId: string,
  guildId = GUILD_A,
): Effect.Effect<readonly string[]> =>
  resolveScope({ guildId, discordUserId: USER }).pipe(
    Effect.map(Option.getOrThrow),
    Effect.flatMap((scope) =>
      readMessages({ scope, channelId, before: Option.none(), limit: READ_LIMIT }),
    ),
    Effect.map((views) =>
      pipe(
        views,
        Array.map(({ id }) => id),
      ),
    ),
    Effect.orDie,
  );

it.effect("keeps unreadable and foreign messages out of a read past the channel check", () =>
  Effect.gen(function* readPastCheck() {
    const reads = yield* Effect.all(
      [
        readPastChannelCheck(A_OPEN),
        readPastChannelCheck(A_STAFF),
        readPastChannelCheck(A_STAFF_THREAD),
        readPastChannelCheck(A_PRIVATE_THREAD),
        readPastChannelCheck(B_OPEN),
        readPastChannelCheck(B_OPEN, GUILD_B),
      ],
      { concurrency: 1 },
    );
    expect(reads).toStrictEqual([[A_OPEN_MESSAGE], [], [], [], [], []]);
  }),
);
