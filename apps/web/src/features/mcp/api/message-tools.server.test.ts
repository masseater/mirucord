import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import {
  A_OPEN,
  A_OPEN_MESSAGE,
  discordMembers,
  GUILD_A,
  OWNER,
  seedScenario,
  SEEDED,
} from "./__tests__/scenario";
import { callTool } from "./__tests__/tool-call";
import type { ToolOutcome } from "./__tests__/tool-call";

const AuthoredMessage = Schema.Struct({ id: Schema.String, authorId: Schema.String });
const Authored = Schema.Struct({ messages: Schema.Array(AuthoredMessage) });
const StoredAt = Schema.NullOr(Schema.String);
const OldestChannel = Schema.Struct({ id: Schema.String, oldestStoredAt: StoredAt });
const Oldest = Schema.Struct({ channels: Schema.Array(OldestChannel) });
const decodeAuthored = Schema.decodeUnknownEffect(Authored);
const decodeOldest = Schema.decodeUnknownEffect(Oldest);

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

it.effect("tells when the oldest stored message of each channel was posted", () =>
  Effect.gen(function* oldest() {
    const { channels } = yield* structuredOf(
      callTool({ name: "list_channels", args: { serverId: GUILD_A } }),
    ).pipe(Effect.flatMap(decodeOldest), Effect.orDie);
    expect(
      pipe(
        channels,
        Array.filter(({ id }) => id === A_OPEN),
      ),
    ).toStrictEqual([{ id: A_OPEN, oldestStoredAt: DateTime.formatIso(SEEDED) }]);
  }),
);
