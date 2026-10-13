import { it } from "@effect/vitest";
import { runDurableObjectAlarm } from "cloudflare:test";
import { Array, Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";
import type { IndexedMessage } from "#/entities/guild-message/index.server";

import { readHead } from "./search-files.server";
import { searchMessages } from "./search-messages.server";

const CHANNEL = "600";
const OTHER_CHANNEL = "601";
const AUTHOR = "701";
const FIRST_AT = 1_790_000_000_000;
const WORD = 7;
const OTHER_WORD = 8;
const BATCH = 500;
const FIRST_PAGE = 0;
const PAGE = 5;
const BIG_TIMEOUT = 120_000;
const FIRST = 1;
const SECOND = 2;
const THIRD = 3;
const OLDEST = 0;
const SEALED_ROWS = 12_500;
const RECENT_EDGE = 12_001;
const EDGE_OFFSET = 498;
const EDGE_PAGE = 4;
const EDITED = 10;
const REMOVED = 20;
const GROWN_ROWS = 32_000;
const SPLIT_ROWS = 43_000;
const LOST_ROWS = 2;
const GROWN_PUBLISHES = 3;
const SPLIT_PUBLISHES = 2;
const NOTHING = 0;
const ARCHIVED_EDIT = 100;
const MANY_PIECES_ROWS = 50_000;
const MANY_PUBLISHES = 7;
const ARCHIVED_REMOVAL = 200;

type Seed = Readonly<{ index: number; tokens: readonly number[]; channelId?: string }>;

const messageAt = ({ index, tokens, channelId = CHANNEL }: Seed): IndexedMessage => ({
  row: {
    id: `${FIRST_AT + index}`,
    channelId,
    authorId: AUTHOR,
    sealed: `sealed-${index}`,
    createdAt: FIRST_AT + index,
    editedAt: Option.getOrNull(Option.none<number>()),
    describedWith: Option.getOrNull(Option.none<string>()),
  },
  tokens,
  phrases: { status: "pending" },
});

const write = (guildId: string, messages: readonly IndexedMessage[]): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(messages, BATCH),
    (batch) => Effect.promise(() => guildStore(guildId).write(batch, "overwrite")),
    { discard: true },
  );

type SeedRange = Readonly<{ guildId: string; from: number; upTo: number }>;

const seedRange = ({ guildId, from, upTo }: SeedRange): Effect.Effect<void> =>
  write(
    guildId,
    Array.range(from, upTo - FIRST).map((index) => messageAt({ index, tokens: [WORD] })),
  );

const publish = (guildId: string, times = FIRST): Effect.Effect<void> =>
  Effect.forEach(
    Array.makeBy(times, () => guildId),
    (id) => Effect.promise(() => guildStore(id).publish()),
    { discard: true },
  );

const remove = (guildId: string, index: number): Effect.Effect<void> =>
  Effect.promise(() => guildStore(guildId).remove([`${FIRST_AT + index}`]));

type Found = Readonly<{ total: number; ids: readonly string[] }>;

type Query = Readonly<{
  guildId: string;
  tokens: readonly number[];
  offset?: number;
  limit?: number;
  channelIds?: readonly string[];
}>;

const find = ({
  guildId,
  tokens,
  offset = FIRST_PAGE,
  limit = PAGE,
  channelIds = [CHANNEL],
}: Query): Effect.Effect<Found> =>
  searchMessages({ guildId, tokens, channelIds, offset, limit }).pipe(
    Effect.map(({ total, entries }) => ({ total, ids: entries.map(({ id }) => id) })),
  );

const totalOf = (query: Query): Effect.Effect<number> =>
  find(query).pipe(Effect.map(({ total }) => total));

const idOf = (index: number): string => `${FIRST_AT + index}`;

it.effect("finds published messages newest first and only in the asked channels", () =>
  Effect.gen(function* small() {
    yield* write("910", [
      messageAt({ index: FIRST, tokens: [WORD] }),
      messageAt({ index: SECOND, tokens: [WORD, OTHER_WORD] }),
      messageAt({ index: THIRD, tokens: [WORD], channelId: OTHER_CHANNEL }),
    ]);
    expect(yield* find({ guildId: "910", tokens: [WORD] })).toStrictEqual({ total: 0, ids: [] });
    yield* publish("910");
    expect(yield* find({ guildId: "910", tokens: [WORD] })).toStrictEqual({
      total: 2,
      ids: [idOf(SECOND), idOf(FIRST)],
    });
    expect(yield* find({ guildId: "910", tokens: [WORD, OTHER_WORD] })).toStrictEqual({
      total: 1,
      ids: [idOf(SECOND)],
    });
    expect(
      yield* find({ guildId: "910", tokens: [WORD], channelIds: [CHANNEL, OTHER_CHANNEL] }),
    ).toStrictEqual({ total: 3, ids: [idOf(THIRD), idOf(SECOND), idOf(FIRST)] });
  }),
);

it.effect("drops edited and removed messages at once and finds new text once published", () =>
  Effect.gen(function* edits() {
    yield* write(
      "920",
      [FIRST, SECOND, THIRD].map((index) => messageAt({ index, tokens: [WORD] })),
    );
    yield* publish("920");
    yield* write("920", [messageAt({ index: SECOND, tokens: [OTHER_WORD] })]);
    yield* remove("920", THIRD);
    expect(yield* find({ guildId: "920", tokens: [WORD] })).toStrictEqual({
      total: 1,
      ids: [idOf(FIRST)],
    });
    yield* publish("920");
    expect(yield* find({ guildId: "920", tokens: [WORD] })).toStrictEqual({
      total: 1,
      ids: [idOf(FIRST)],
    });
    expect(yield* find({ guildId: "920", tokens: [OTHER_WORD] })).toStrictEqual({
      total: 1,
      ids: [idOf(SECOND)],
    });
  }),
);

const sealHistory = Effect.gen(function* sealed() {
  yield* seedRange({ guildId: "930", from: OLDEST, upTo: SEALED_ROWS });
  yield* publish("930");
  expect(yield* totalOf({ guildId: "930", tokens: [WORD] })).toBe(SEALED_ROWS);
  expect(
    yield* find({ guildId: "930", tokens: [WORD], offset: EDGE_OFFSET, limit: EDGE_PAGE }),
  ).toStrictEqual({
    total: SEALED_ROWS,
    ids: Array.range(RECENT_EDGE - EDGE_PAGE + FIRST, RECENT_EDGE)
      .toReversed()
      .map((index) => idOf(index)),
  });
});

const editSealed = Effect.gen(function* edited() {
  yield* write("930", [messageAt({ index: EDITED, tokens: [OTHER_WORD] })]);
  yield* remove("930", REMOVED);
  yield* publish("930");
  expect(yield* totalOf({ guildId: "930", tokens: [WORD] })).toBe(SEALED_ROWS - LOST_ROWS);
  expect(yield* find({ guildId: "930", tokens: [OTHER_WORD] })).toStrictEqual({
    total: 1,
    ids: [idOf(EDITED)],
  });
});

const growHistory = Effect.gen(function* grown() {
  yield* seedRange({ guildId: "930", from: SEALED_ROWS, upTo: GROWN_ROWS });
  yield* publish("930", GROWN_PUBLISHES);
  const total = GROWN_ROWS - LOST_ROWS;
  expect(
    yield* find({ guildId: "930", tokens: [WORD], offset: total - THIRD, limit: PAGE }),
  ).toStrictEqual({ total, ids: [idOf(SECOND), idOf(FIRST), idOf(OLDEST)] });
});

const splitHistory = Effect.gen(function* split() {
  yield* seedRange({ guildId: "930", from: GROWN_ROWS, upTo: SPLIT_ROWS });
  yield* publish("930", SPLIT_PUBLISHES);
  expect(yield* find({ guildId: "930", tokens: [WORD], limit: SECOND })).toStrictEqual({
    total: SPLIT_ROWS - LOST_ROWS,
    ids: [idOf(SPLIT_ROWS - FIRST), idOf(SPLIT_ROWS - SECOND)],
  });
});

const archiveHistory = Effect.gen(function* archived() {
  const head = yield* readHead("930");
  expect(Option.isSome(Option.fromUndefinedOr(head.archive))).toBe(true);
  expect(
    head.segments.filter((entry) => entry.kind === "sealed" && !entry.archived).length,
  ).toBeLessThanOrEqual(SECOND);
  yield* write("930", [messageAt({ index: ARCHIVED_EDIT, tokens: [OTHER_WORD] })]);
  yield* remove("930", ARCHIVED_REMOVAL);
  yield* publish("930");
  const total = SPLIT_ROWS - LOST_ROWS - LOST_ROWS;
  expect(yield* find({ guildId: "930", tokens: [WORD], offset: total - SECOND })).toStrictEqual({
    total,
    ids: [idOf(FIRST), idOf(OLDEST)],
  });
  expect(yield* find({ guildId: "930", tokens: [OTHER_WORD] })).toStrictEqual({
    total: 2,
    ids: [idOf(ARCHIVED_EDIT), idOf(EDITED)],
  });
  expect(yield* totalOf({ guildId: "930", tokens: [WORD], channelIds: [OTHER_CHANNEL] })).toBe(
    NOTHING,
  );
});

it.effect(
  "seals large histories into segments and keeps edits and pages consistent",
  () =>
    Effect.all([sealHistory, editSealed, growHistory, splitHistory, archiveHistory], {
      discard: true,
    }),
  BIG_TIMEOUT,
);

it.effect("removes every search file when the server is cleared", () =>
  Effect.gen(function* cleared() {
    yield* write("940", [messageAt({ index: FIRST, tokens: [WORD] })]);
    yield* publish("940");
    yield* Effect.promise(() => guildStore("940").clear());
    expect(yield* find({ guildId: "940", tokens: [WORD] })).toStrictEqual({ total: 0, ids: [] });
  }),
);

it.effect("keeps new messages for the next flush when an alarm comes early", () =>
  Effect.gen(function* early() {
    yield* write("950", [messageAt({ index: FIRST, tokens: [WORD] })]);
    yield* publish("950");
    yield* write("950", [messageAt({ index: SECOND, tokens: [OTHER_WORD] })]);
    expect(yield* Effect.promise(() => runDurableObjectAlarm(guildStore("950")))).toBe(true);
    expect(yield* totalOf({ guildId: "950", tokens: [OTHER_WORD] })).toBe(NOTHING);
    yield* publish("950");
    expect(yield* find({ guildId: "950", tokens: [OTHER_WORD] })).toStrictEqual({
      total: 1,
      ids: [idOf(SECOND)],
    });
  }),
);

it.effect(
  "archives every full piece of a large history built at once",
  () =>
    Effect.gen(function* many() {
      yield* seedRange({ guildId: "960", from: OLDEST, upTo: MANY_PIECES_ROWS });
      yield* publish("960", MANY_PUBLISHES);
      const head = yield* readHead("960");
      expect(
        head.segments.filter((entry) => entry.kind === "sealed" && !entry.archived).length,
      ).toBeLessThanOrEqual(SECOND);
      expect(yield* totalOf({ guildId: "960", tokens: [WORD] })).toBe(MANY_PIECES_ROWS);
    }),
  BIG_TIMEOUT,
);
