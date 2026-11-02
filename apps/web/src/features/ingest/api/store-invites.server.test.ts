import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { runInDurableObject } from "cloudflare:test";
import { DateTime, Effect, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import { seedMemberGuild } from "./__tests__/stored-members";
import { storeGatewayMembers, syncMembers } from "./store-members.server";

const TRACKED_GUILD = "830";
const HIDDEN_GUILD = "831";
const NOTICE_CHANNEL = "840";
const INVITER = "901";
const CAROL = "803";
const FORBIDDEN = 403;
const UNLIMITED = 0;
const FIRST_USE = 1;
const SECOND_USE = 2;

const SELECT_JOINS = "SELECT userId, precision, candidates FROM invite_join";

const StoredJoin = Schema.Struct({
  userId: Schema.String,
  precision: Schema.String,
  candidates: Schema.fromJsonString(Schema.Unknown),
});
const decodeJoins = Schema.decodeUnknownEffect(Schema.Array(StoredJoin));

const invitesUrl = (guildId: string): string =>
  `https://discord.com/api/v10/guilds/${guildId}/invites`;

const invite = (code: string, uses: number): Readonly<Record<string, unknown>> => ({
  code,
  inviter: { id: INVITER, username: "owner" },
  channel: { id: NOTICE_CHANNEL, name: "general", type: 0 },
  uses,
  max_uses: UNLIMITED,
});

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(
    http.get("https://discord.com/api/v10/guilds/:guildId/members", () => HttpResponse.json([])),
    http.get(invitesUrl(HIDDEN_GUILD), () =>
      HttpResponse.json({ message: "Missing Permissions", code: 50_013 }, { status: FORBIDDEN }),
    ),
  );
  return Effect.runPromise(
    Effect.all([
      seedMemberGuild({ id: TRACKED_GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: HIDDEN_GUILD, noticeChannelId: NOTICE_CHANNEL }),
    ]),
  );
});

afterAll(() => {
  network.disable();
});

const storedJoins = (guildId: string): Effect.Effect<readonly (typeof StoredJoin.Type)[]> =>
  Effect.promise(() =>
    runInDurableObject(guildStore(guildId), (_store, state) =>
      state.storage.sql.exec(SELECT_JOINS).toArray(),
    ),
  ).pipe(Effect.flatMap(decodeJoins), Effect.orDie);

const joinNow = (guildId: string): Effect.Effect<void> =>
  Effect.gen(function* join() {
    const now = yield* DateTime.now;
    yield* storeGatewayMembers({
      kind: "members",
      guildId,
      members: [{ user: { id: CAROL, username: "carol" }, roles: [], joined_at: now }],
    });
  });

it.effect("records the invite whose use count went up when someone joins", () =>
  Effect.gen(function* tracked() {
    network.use(
      http.get(invitesUrl(TRACKED_GUILD), () =>
        HttpResponse.json([invite("abc", FIRST_USE), invite("def", UNLIMITED)]),
      ),
    );
    yield* syncMembers(TRACKED_GUILD);
    network.use(
      http.get(invitesUrl(TRACKED_GUILD), () =>
        HttpResponse.json([invite("abc", SECOND_USE), invite("def", UNLIMITED)]),
      ),
    );
    yield* joinNow(TRACKED_GUILD);
    yield* joinNow(TRACKED_GUILD);
    expect(yield* storedJoins(TRACKED_GUILD)).toStrictEqual([
      {
        userId: CAROL,
        precision: "exact",
        candidates: [{ code: "abc", inviterId: INVITER, channelId: NOTICE_CHANNEL }],
      },
    ]);
  }),
);

it.effect("records nothing when the bot cannot read the server's invites", () =>
  Effect.gen(function* hidden() {
    yield* joinNow(HIDDEN_GUILD);
    expect(yield* storedJoins(HIDDEN_GUILD)).toStrictEqual([]);
  }),
);
