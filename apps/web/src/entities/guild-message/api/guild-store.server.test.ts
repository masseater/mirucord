import { it } from "@effect/vitest";
import { DiscordSnowflake } from "@sapphire/snowflake";
import { Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import type { IndexedMessage } from "#/entities/guild-message/model/stored-message";

import { guildStore } from "./guild-stub.server";

const GUILD = "7001";
const CHANNEL = "7101";
const HIDDEN_CHANNEL = "7102";
const TOKEN = "00000000000000aa";
const OLDEST = "1557624521786138727";
const MIDDLE = "1557951565401423983";
const HIDDEN = "1558714767412039731";
const NEWEST = "1558988135612817419";
const PAGE = 2;
const NO_CURSOR = Option.getOrNull(Option.none<number>());
const NOT_EDITED = Option.getOrNull(Option.none<number>());
const UNDESCRIBED = Option.getOrNull(Option.none<string>());

const indexed = (id: string, channelId: string): IndexedMessage => ({
  row: {
    id,
    channelId,
    authorId: "7201",
    sealed: "sealed",
    createdAt: DiscordSnowflake.timestampFrom(id),
    editedAt: NOT_EDITED,
    describedWith: UNDESCRIBED,
  },
  tokens: [TOKEN],
});

it.effect("returns matches newest first in pages that continue from the cursor", () =>
  Effect.gen(function* pages() {
    const store = guildStore(GUILD);
    yield* Effect.promise(() =>
      store.write(
        [
          indexed(NEWEST, CHANNEL),
          indexed(OLDEST, CHANNEL),
          indexed(HIDDEN, HIDDEN_CHANNEL),
          indexed(MIDDLE, CHANNEL),
        ],
        "overwrite",
      ),
    );
    const first = yield* Effect.promise(() =>
      store.candidates([TOKEN], [CHANNEL], { before: NO_CURSOR, limit: PAGE }),
    );
    const second = yield* Effect.promise(() =>
      store.candidates([TOKEN], [CHANNEL], { before: first.next, limit: PAGE }),
    );
    const third = yield* Effect.promise(() =>
      store.candidates([TOKEN], [CHANNEL], { before: second.next, limit: PAGE }),
    );
    expect(first.messages.map(({ id }) => id)).toStrictEqual([NEWEST]);
    expect(second.messages.map(({ id }) => id)).toStrictEqual([MIDDLE, OLDEST]);
    expect(third.messages).toStrictEqual([]);
    expect(third.next).toBeNull();
  }),
);
