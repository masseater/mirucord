import { it } from "@effect/vitest";
import { runDurableObjectAlarm } from "cloudflare:test";
import { Array, Effect, Option, pipe } from "effect";
import { expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";
import type { IndexedMessage } from "#/entities/guild-message/index.server";

import { readHead } from "./search-files.server";
import {
  BATCH,
  CHANNEL,
  FIRST,
  FIRST_AT,
  PAGE,
  WORD,
  find,
  idOf,
  messageAt,
  totalOf,
} from "./search-publish.test.support";

const OTHER_CHANNEL = "601";
const OTHER_WORD = 8;
const BIG_TIMEOUT = 120_000;
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

const write = (guildId: string, messages: readonly IndexedMessage[]): Effect.Effect<void> =>
  Effect.forEach(
    Array.chunksOf(messages, BATCH),
    (batch) => Effect.promise(() => guildStore(guildId).write(batch, "overwrite")),
    { concurrency: 1, discard: true },
  );

type SeedRange = Readonly<{ guildId: string; from: number; upTo: number }>;

const seedRange = ({ guildId, from, upTo }: SeedRange): Effect.Effect<void> =>
  write(
    guildId,
    pipe(
      Array.range(from, upTo - FIRST),
      Array.map((index) => messageAt({ index, tokens: [WORD] })),
    ),
  );

const publish = (guildId: string, times = FIRST): Effect.Effect<void> =>
  Effect.forEach(
    Array.makeBy(times, () => guildId),
    (id) => Effect.promise(() => guildStore(id).publish()),
    { concurrency: 1, discard: true },
  );

const remove = (guildId: string, index: number): Effect.Effect<void> =>
  Effect.promise(() => guildStore(guildId).remove([`${FIRST_AT + index}`]));

it.effect("finds published messages newest first and only in the asked channels", () =>
  Effect.gen(function* small() {
    yield* write("910", [
      messageAt({ index: FIRST, tokens: [WORD] }),
      messageAt({ index: SECOND, tokens: [WORD, OTHER_WORD] }),
      messageAt({ index: THIRD, tokens: [WORD], channelId: OTHER_CHANNEL }),
    ]);
    const beforePublish = yield* find({ guildId: "910", tokens: [WORD] });
    expect(beforePublish).toStrictEqual({ total: 0, ids: [] });
    yield* publish("910");
    const published = yield* Effect.all(
      {
        word: find({ guildId: "910", tokens: [WORD] }),
        bothWords: find({ guildId: "910", tokens: [WORD, OTHER_WORD] }),
        bothChannels: find({
          guildId: "910",
          tokens: [WORD],
          channelIds: [CHANNEL, OTHER_CHANNEL],
        }),
      },
      { concurrency: 1 },
    );
    expect(published).toStrictEqual({
      word: { total: 2, ids: [idOf(SECOND), idOf(FIRST)] },
      bothWords: { total: 1, ids: [idOf(SECOND)] },
      bothChannels: { total: 3, ids: [idOf(THIRD), idOf(SECOND), idOf(FIRST)] },
    });
  }),
);

it.effect("drops edited and removed messages at once and finds new text once published", () =>
  Effect.gen(function* edits() {
    yield* write(
      "920",
      pipe(
        [FIRST, SECOND, THIRD],
        Array.map((index) => messageAt({ index, tokens: [WORD] })),
      ),
    );
    yield* publish("920");
    yield* write("920", [messageAt({ index: SECOND, tokens: [OTHER_WORD] })]);
    yield* remove("920", THIRD);
    const beforePublish = yield* find({ guildId: "920", tokens: [WORD] });
    expect(beforePublish).toStrictEqual({ total: 1, ids: [idOf(FIRST)] });
    yield* publish("920");
    const published = yield* Effect.all(
      {
        word: find({ guildId: "920", tokens: [WORD] }),
        editedText: find({ guildId: "920", tokens: [OTHER_WORD] }),
      },
      { concurrency: 1 },
    );
    expect(published).toStrictEqual({
      word: { total: 1, ids: [idOf(FIRST)] },
      editedText: { total: 1, ids: [idOf(SECOND)] },
    });
  }),
);

const sealHistory = Effect.gen(function* sealed() {
  yield* seedRange({ guildId: "930", from: OLDEST, upTo: SEALED_ROWS });
  yield* publish("930");
  const history = yield* Effect.all(
    {
      total: totalOf({ guildId: "930", tokens: [WORD] }),
      edgePage: find({ guildId: "930", tokens: [WORD], offset: EDGE_OFFSET, limit: EDGE_PAGE }),
    },
    { concurrency: 1 },
  );
  expect(history).toStrictEqual({
    total: SEALED_ROWS,
    edgePage: {
      total: SEALED_ROWS,
      ids: pipe(
        Array.range(RECENT_EDGE - EDGE_PAGE + FIRST, RECENT_EDGE),
        Array.reverse,
        Array.map((index) => idOf(index)),
      ),
    },
  });
});

const editSealed = Effect.gen(function* edited() {
  yield* write("930", [messageAt({ index: EDITED, tokens: [OTHER_WORD] })]);
  yield* remove("930", REMOVED);
  yield* publish("930");
  const published = yield* Effect.all(
    {
      keptTotal: totalOf({ guildId: "930", tokens: [WORD] }),
      editedText: find({ guildId: "930", tokens: [OTHER_WORD] }),
    },
    { concurrency: 1 },
  );
  expect(published).toStrictEqual({
    keptTotal: SEALED_ROWS - LOST_ROWS,
    editedText: { total: 1, ids: [idOf(EDITED)] },
  });
});

const growHistory = Effect.gen(function* grown() {
  yield* seedRange({ guildId: "930", from: SEALED_ROWS, upTo: GROWN_ROWS });
  yield* publish("930", GROWN_PUBLISHES);
  const total = GROWN_ROWS - LOST_ROWS;
  const page = yield* find({ guildId: "930", tokens: [WORD], offset: total - THIRD, limit: PAGE });
  expect(page).toStrictEqual({ total, ids: [idOf(SECOND), idOf(FIRST), idOf(OLDEST)] });
});

const splitHistory = Effect.gen(function* split() {
  yield* seedRange({ guildId: "930", from: GROWN_ROWS, upTo: SPLIT_ROWS });
  yield* publish("930", SPLIT_PUBLISHES);
  const newestPage = yield* find({ guildId: "930", tokens: [WORD], limit: SECOND });
  expect(newestPage).toStrictEqual({
    total: SPLIT_ROWS - LOST_ROWS,
    ids: [idOf(SPLIT_ROWS - FIRST), idOf(SPLIT_ROWS - SECOND)],
  });
});

const archiveHistory = Effect.gen(function* archived() {
  const head = yield* readHead("930");
  expect(Option.isSome(Option.fromUndefinedOr(head.archive))).toBe(true);
  expect(
    pipe(
      head.segments,
      Array.filter((entry) => entry.kind === "sealed" && !entry.archived),
    ).length,
  ).toBeLessThanOrEqual(SECOND);
  yield* write("930", [messageAt({ index: ARCHIVED_EDIT, tokens: [OTHER_WORD] })]);
  yield* remove("930", ARCHIVED_REMOVAL);
  yield* publish("930");
  const total = SPLIT_ROWS - LOST_ROWS - LOST_ROWS;
  const published = yield* Effect.all(
    {
      oldestPage: find({ guildId: "930", tokens: [WORD], offset: total - SECOND }),
      editedText: find({ guildId: "930", tokens: [OTHER_WORD] }),
      otherChannelTotal: totalOf({ guildId: "930", tokens: [WORD], channelIds: [OTHER_CHANNEL] }),
    },
    { concurrency: 1 },
  );
  expect(published).toStrictEqual({
    oldestPage: { total, ids: [idOf(FIRST), idOf(OLDEST)] },
    editedText: { total: 2, ids: [idOf(ARCHIVED_EDIT), idOf(EDITED)] },
    otherChannelTotal: NOTHING,
  });
});

it.effect(
  "seals large histories into segments and keeps edits and pages consistent",
  () =>
    Effect.all([sealHistory, editSealed, growHistory, splitHistory, archiveHistory], {
      concurrency: 1,
      discard: true,
    }),
  BIG_TIMEOUT,
);

it.effect("removes every search file when the server is cleared", () =>
  Effect.gen(function* cleared() {
    yield* write("940", [messageAt({ index: FIRST, tokens: [WORD] })]);
    yield* publish("940");
    yield* Effect.promise(() => guildStore("940").clear());
    const afterClear = yield* find({ guildId: "940", tokens: [WORD] });
    expect(afterClear).toStrictEqual({ total: 0, ids: [] });
  }),
);

it.effect("keeps new messages for the next flush when an alarm comes early", () =>
  Effect.gen(function* early() {
    yield* write("950", [messageAt({ index: FIRST, tokens: [WORD] })]);
    yield* publish("950");
    yield* write("950", [messageAt({ index: SECOND, tokens: [OTHER_WORD] })]);
    const alarmed = yield* Effect.promise(() => runDurableObjectAlarm(guildStore("950")));
    expect(alarmed).toBe(true);
    const unflushedTotal = yield* totalOf({ guildId: "950", tokens: [OTHER_WORD] });
    expect(unflushedTotal).toBe(NOTHING);
    yield* publish("950");
    const afterPublish = yield* find({ guildId: "950", tokens: [OTHER_WORD] });
    expect(afterPublish).toStrictEqual({ total: 1, ids: [idOf(SECOND)] });
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
        pipe(
          head.segments,
          Array.filter((entry) => entry.kind === "sealed" && !entry.archived),
        ).length,
      ).toBeLessThanOrEqual(SECOND);
      const piecesTotal = yield* totalOf({ guildId: "960", tokens: [WORD] });
      expect(piecesTotal).toBe(MANY_PIECES_ROWS);
    }),
  BIG_TIMEOUT,
);
