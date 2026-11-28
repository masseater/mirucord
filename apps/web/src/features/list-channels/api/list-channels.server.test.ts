import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import {
  A_OPEN,
  discordMembers,
  GUILD_A,
  seedScenario,
  SEEDED,
  userToolCaller,
} from "#/entities/guild-message/index.test.support";

import { registerListChannels } from "./list-channels.server.ts";

const callTool = userToolCaller([registerListChannels]);

const StoredAt = Schema.NullOr(Schema.String);
const OldestChannel = Schema.Struct({ id: Schema.String, oldestStoredAt: StoredAt });
const Oldest = Schema.Struct({ channels: Schema.Array(OldestChannel) });
const decodeOldest = Schema.decodeUnknownEffect(Oldest);

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(discordMembers);
  return seedScenario();
});

afterAll(() => {
  network.disable();
});

it.effect("tells when the oldest stored message of each channel was posted", () =>
  Effect.gen(function* oldest() {
    const { channels } = yield* callTool({
      name: "list_channels",
      args: { serverId: GUILD_A },
    }).pipe(
      Effect.map(({ structured }) => Option.getOrUndefined(structured)),
      Effect.flatMap(decodeOldest),
      Effect.orDie,
    );
    expect(
      pipe(
        channels,
        Array.filter(({ id }) => id === A_OPEN),
      ),
    ).toStrictEqual([{ id: A_OPEN, oldestStoredAt: DateTime.formatIso(SEEDED) }]);
  }),
);
