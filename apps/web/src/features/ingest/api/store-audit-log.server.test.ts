import { it } from "@effect/vitest";
import { runInDurableObject } from "cloudflare:test";
import { Array, Effect, Option, pipe, Schema, String as Str } from "effect";
import { beforeAll, expect } from "vite-plus/test";

import { guildStore } from "#/entities/guild-message/index.server";

import { seedMemberGuild } from "./__tests__/stored-members";
import { storeAuditLog } from "./store-activity.server";

const AUDIT_GUILD = "874";
const QUIET_GUILD = "884";
const NOTICE_CHANNEL = "820";
const ENTRY = "1434500000000000000";
const KICK = 20;
const AT = 1000;
const DETAIL = '{"reason":"spam"}';
const NO_CONSENT = Option.getOrNull(Option.none<string>());

const Row = Schema.Struct({
  id: Schema.String,
  targetId: Schema.NullOr(Schema.String),
  sealed: Schema.String,
});
const decodeRows = Schema.decodeUnknownEffect(Schema.Array(Row));

const storedOf = (guildId: string): Effect.Effect<readonly (typeof Row.Type)[]> =>
  Effect.promise(() =>
    runInDurableObject(guildStore(guildId), (_store, state) =>
      state.storage.sql.exec("SELECT id, targetId, sealed FROM audit_entry").toArray(),
    ),
  ).pipe(Effect.flatMap(decodeRows), Effect.orDie);

const KICKED = {
  entryId: ENTRY,
  actionType: KICK,
  userId: "801",
  targetId: "802",
  at: AT,
  detail: DETAIL,
};

beforeAll(() =>
  Effect.runPromise(
    Effect.all([
      seedMemberGuild({ id: AUDIT_GUILD, noticeChannelId: NOTICE_CHANNEL }),
      seedMemberGuild({ id: QUIET_GUILD, noticeChannelId: NO_CONSENT }),
    ]),
  ),
);

it.effect("keeps an audit log entry once, with its reason and changes sealed", () =>
  Effect.gen(function* storedOnce() {
    const job = { kind: "auditLog", guildId: AUDIT_GUILD, changes: [KICKED] } as const;
    yield* storeAuditLog(job);
    yield* storeAuditLog(job);
    const rows = yield* storedOf(AUDIT_GUILD);
    const kept = pipe(
      rows,
      Array.map(({ id, targetId, sealed }) => ({
        id,
        targetId,
        plain: Str.includes("spam")(sealed),
      })),
    );
    expect(kept).toStrictEqual([{ id: ENTRY, targetId: "802", plain: false }]);
  }),
);

it.effect("records no audit log before the admin consents", () =>
  Effect.gen(function* quiet() {
    yield* storeAuditLog({ kind: "auditLog", guildId: QUIET_GUILD, changes: [KICKED] });
    expect(yield* storedOf(QUIET_GUILD)).toStrictEqual([]);
  }),
);
