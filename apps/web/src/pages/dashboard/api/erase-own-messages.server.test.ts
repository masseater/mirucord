import { it } from "@effect/vitest";
import { DateTime, Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";
import type { IndexedMessage } from "#/entities/guild-message/index.server";
import { createGuildKey } from "#/shared/crypto/index.server";
import { db, guild } from "#/shared/db/index.server";

import { eraseOwnMessages } from "./erase-own-messages.server";

const OWNER = "901";
const AUTHOR = "701";
const OTHER = "702";
const CHANNEL = "600";
const SEEDED = DateTime.makeUnsafe("2026-10-01T00:00:00Z");
const UNBOUNDED = Option.getOrNull(Option.none<number>());

const messageBy = (id: string, authorId: string): IndexedMessage => ({
  row: {
    id,
    channelId: CHANNEL,
    authorId,
    sealed: "sealed",
    createdAt: DateTime.toEpochMillis(SEEDED),
    editedAt: Option.getOrNull(Option.none<number>()),
    describedWith: Option.getOrNull(Option.none<string>()),
  },
  tokens: [],
});

const writeMessages = (guildId: string, messages: readonly IndexedMessage[]): Effect.Effect<void> =>
  Effect.promise(() => guildStore(guildId).write(messages, "overwrite"));

const seedGuild = (guildId: string): Effect.Effect<void> => {
  const seeded = [messageBy(`${guildId}-mine`, AUTHOR), messageBy(`${guildId}-theirs`, OTHER)];
  return createGuildKey.pipe(
    Effect.flatMap((wrappedKey) =>
      Effect.promise(() =>
        db.insert(guild).values({
          id: guildId,
          name: guildId,
          ownerId: OWNER,
          wrappedKey,
          joinedAt: DateTime.toDate(SEEDED),
        }),
      ),
    ),
    Effect.andThen(writeMessages(guildId, seeded)),
  );
};

const storedIds = (guildId: string): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    guildStore(guildId).idsBetween(CHANNEL, { from: UNBOUNDED, upTo: UNBOUNDED }),
  );

it.effect("removes the author's messages only from the chosen server", () =>
  Effect.gen(function* erased() {
    yield* seedGuild("810");
    yield* seedGuild("820");
    expect(yield* eraseOwnMessages({ guildId: "810", authorId: AUTHOR })).toStrictEqual({
      status: "erased",
    });
    expect(yield* storedIds("810")).toStrictEqual(["810-theirs"]);
    expect(yield* storedIds("820")).toStrictEqual(["820-mine", "820-theirs"]);
  }),
);

it.effect("does not store the author's messages again in that server", () =>
  Effect.gen(function* stayErased() {
    yield* seedGuild("830");
    yield* eraseOwnMessages({ guildId: "830", authorId: AUTHOR });
    yield* writeMessages("830", [messageBy("830-again", AUTHOR)]);
    expect(yield* storedIds("830")).toStrictEqual(["830-theirs"]);
  }),
);

it.effect("keeps the erasure after the server's messages are cleared", () =>
  Effect.gen(function* afterClear() {
    yield* seedGuild("840");
    yield* eraseOwnMessages({ guildId: "840", authorId: AUTHOR });
    yield* Effect.promise(() => guildStore("840").clear());
    yield* writeMessages("840", [messageBy("840-again", AUTHOR)]);
    expect(yield* storedIds("840")).toStrictEqual([]);
  }),
);

it.effect("refuses an unknown server", () =>
  Effect.gen(function* unknown() {
    expect(yield* eraseOwnMessages({ guildId: "850", authorId: AUTHOR })).toStrictEqual({
      status: "notFound",
    });
  }),
);
