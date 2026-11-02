import { it } from "@effect/vitest";
import { runInDurableObject } from "cloudflare:test";
import { Effect, Option, Schema } from "effect";
import { beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import { seedMemberGuild } from "./__tests__/stored-members";
import { storeGatewayVoice, storeVoiceSnapshot } from "./store-activity.server";

const MOVING_GUILD = "830";
const SNAPSHOT_GUILD = "840";
const QUIET_GUILD = "850";
const NOTICE_CHANNEL = "820";
const ALICE = "801";
const BOB = "802";
const CAROL = "803";
const LOUNGE = "860";
const GAMES = "861";
const JOINED_AT = 1000;
const MOVED_AT = 2000;
const LEFT_AT = 3000;
const SNAPSHOT_AT = 5000;
const LEFT = Option.getOrNull(Option.none<string>());
const NO_CONSENT = Option.getOrNull(Option.none<string>());

const SessionRow = Schema.Struct({
  userId: Schema.String,
  channelId: Schema.String,
  joinedAt: Schema.Finite,
  joinPrecision: Schema.String,
  leftAt: Schema.NullOr(Schema.Finite),
  leavePrecision: Schema.NullOr(Schema.String),
});
const decodeRows = Schema.decodeUnknownEffect(Schema.Array(SessionRow));
const SELECT_SESSIONS =
  "SELECT userId, channelId, joinedAt, joinPrecision, leftAt, leavePrecision FROM voice_session ORDER BY id";

const storedSessions = (guildId: string): Effect.Effect<readonly (typeof SessionRow.Type)[]> =>
  Effect.promise(() =>
    runInDurableObject(guildStore(guildId), (_store, state) =>
      state.storage.sql.exec(SELECT_SESSIONS).toArray(),
    ),
  ).pipe(Effect.flatMap(decodeRows), Effect.orDie);

beforeAll(() =>
  Effect.runPromise(
    Effect.all([
      seedMemberGuild({ id: MOVING_GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: SNAPSHOT_GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: QUIET_GUILD, noticeChannelId: NO_CONSENT }),
    ]),
  ),
);

it.effect("records a stay per channel as people join, move and leave", () =>
  Effect.gen(function* moving() {
    yield* storeGatewayVoice({
      kind: "voice",
      guildId: MOVING_GUILD,
      changes: [
        { userId: ALICE, channelId: LOUNGE, at: JOINED_AT },
        { userId: ALICE, channelId: LOUNGE, at: JOINED_AT },
        { userId: ALICE, channelId: GAMES, at: MOVED_AT },
        { userId: ALICE, channelId: LEFT, at: LEFT_AT },
      ],
    });
    expect(yield* storedSessions(MOVING_GUILD)).toStrictEqual([
      {
        userId: ALICE,
        channelId: LOUNGE,
        joinedAt: JOINED_AT,
        joinPrecision: "exact",
        leftAt: MOVED_AT,
        leavePrecision: "exact",
      },
      {
        userId: ALICE,
        channelId: GAMES,
        joinedAt: MOVED_AT,
        joinPrecision: "exact",
        leftAt: LEFT_AT,
        leavePrecision: "exact",
      },
    ]);
  }),
);

it.effect("reconciles open stays with who is in voice after reconnecting", () =>
  Effect.gen(function* snapshot() {
    yield* storeGatewayVoice({
      kind: "voice",
      guildId: SNAPSHOT_GUILD,
      changes: [
        { userId: ALICE, channelId: LOUNGE, at: JOINED_AT },
        { userId: BOB, channelId: LOUNGE, at: JOINED_AT },
      ],
    });
    yield* storeVoiceSnapshot({
      kind: "voiceSnapshot",
      guildId: SNAPSHOT_GUILD,
      at: SNAPSHOT_AT,
      present: [
        { userId: ALICE, channelId: LOUNGE },
        { userId: CAROL, channelId: GAMES },
      ],
    });
    expect(yield* storedSessions(SNAPSHOT_GUILD)).toStrictEqual([
      {
        userId: ALICE,
        channelId: LOUNGE,
        joinedAt: JOINED_AT,
        joinPrecision: "exact",
        leftAt: LEFT,
        leavePrecision: LEFT,
      },
      {
        userId: BOB,
        channelId: LOUNGE,
        joinedAt: JOINED_AT,
        joinPrecision: "exact",
        leftAt: SNAPSHOT_AT,
        leavePrecision: "noLaterThan",
      },
      {
        userId: CAROL,
        channelId: GAMES,
        joinedAt: SNAPSHOT_AT,
        joinPrecision: "noLaterThan",
        leftAt: LEFT,
        leavePrecision: LEFT,
      },
    ]);
  }),
);

it.effect("records nothing before the admin consents", () =>
  Effect.gen(function* quiet() {
    yield* storeGatewayVoice({
      kind: "voice",
      guildId: QUIET_GUILD,
      changes: [{ userId: ALICE, channelId: LOUNGE, at: JOINED_AT }],
    });
    expect(yield* storedSessions(QUIET_GUILD)).toStrictEqual([]);
  }),
);
