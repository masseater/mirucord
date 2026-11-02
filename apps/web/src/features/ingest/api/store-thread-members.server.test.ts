import { it } from "@effect/vitest";
import { runInDurableObject } from "cloudflare:test";
import { Effect, Option, Schema } from "effect";
import { beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import { seedMemberGuild } from "./__tests__/stored-members";
import { storeThreadMembers } from "./store-activity.server";

const THREAD_GUILD = "873";
const QUIET_GUILD = "883";
const NOTICE_CHANNEL = "820";
const ALICE = "801";
const BOB = "802";
const THREAD = "730";
const JOINED_AT = 1000;
const REJOINED_AT = 4000;
const LEFT_AT = 3000;
const NO_CONSENT = Option.getOrNull(Option.none<string>());

const Row = Schema.Struct({
  userId: Schema.String,
  joinedAt: Schema.Finite,
  leftAt: Schema.NullOr(Schema.Finite),
});
const decodeRows = Schema.decodeUnknownEffect(Schema.Array(Row));

const storedOf = (guildId: string): Effect.Effect<readonly (typeof Row.Type)[]> =>
  Effect.promise(() =>
    runInDurableObject(guildStore(guildId), (_store, state) =>
      state.storage.sql
        .exec("SELECT userId, joinedAt, leftAt FROM thread_member ORDER BY userId")
        .toArray(),
    ),
  ).pipe(Effect.flatMap(decodeRows), Effect.orDie);

beforeAll(() =>
  Effect.runPromise(
    Effect.all([
      seedMemberGuild({ id: THREAD_GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: QUIET_GUILD, noticeChannelId: NO_CONSENT }),
    ]),
  ),
);

it.effect("keeps when people joined and left a thread, and a rejoin clears the leave", () =>
  Effect.gen(function* membership() {
    yield* storeThreadMembers({
      kind: "threadMembers",
      guildId: THREAD_GUILD,
      changes: [
        { kind: "join", threadId: THREAD, userId: ALICE, at: JOINED_AT },
        { kind: "join", threadId: THREAD, userId: BOB, at: JOINED_AT },
        { kind: "leave", threadId: THREAD, userId: ALICE, at: LEFT_AT },
        { kind: "leave", threadId: THREAD, userId: BOB, at: LEFT_AT },
        { kind: "join", threadId: THREAD, userId: BOB, at: REJOINED_AT },
      ],
    });
    expect(yield* storedOf(THREAD_GUILD)).toStrictEqual([
      { userId: ALICE, joinedAt: JOINED_AT, leftAt: LEFT_AT },
      { userId: BOB, joinedAt: REJOINED_AT, leftAt: Option.getOrNull(Option.none<number>()) },
    ]);
  }),
);

it.effect("records no thread members before the admin consents", () =>
  Effect.gen(function* quiet() {
    yield* storeThreadMembers({
      kind: "threadMembers",
      guildId: QUIET_GUILD,
      changes: [{ kind: "join", threadId: THREAD, userId: ALICE, at: JOINED_AT }],
    });
    expect(yield* storedOf(QUIET_GUILD)).toStrictEqual([]);
  }),
);
