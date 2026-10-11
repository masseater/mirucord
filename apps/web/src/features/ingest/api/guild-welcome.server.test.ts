import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, expect } from "vite-plus/test";

import { db, guild } from "#/shared/db/index.server";

import { syncJoinedGuild } from "./sync-guilds.server";

const BOT = "900";
const OWNER = "901";
const INVITER = "903";
const DM_CHANNEL = "950";
const SYSTEM_CHANNEL = "811";
const OTHER_CHANNEL = "812";
const DISCORD = "https://discord.com/api/v10";
const FORBIDDEN = 403;
const CANNOT_DM = 50_007;

const network = setupNetwork();

const DirectChannelBody = Schema.Struct({ recipient_id: Schema.String });
const MessageBody = Schema.Struct({ content: Schema.String });

const bodyOf = <Body extends Schema.Top>(
  schema: Body,
  request: Readonly<{ json: () => Promise<unknown> }>,
): Effect.Effect<Body["Type"], never, Body["DecodingServices"]> =>
  Effect.promise(() => request.json()).pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(schema)),
    Effect.orDie,
  );

type Sent = Readonly<{ channelId: string; content: string }>;

type Scenario = Readonly<{
  guildId: string;
  auditLog: "readable" | "forbidden";
  dm: "open" | "closed";
}>;

const outgoing = (
  record: (message: Sent) => void,
  dm: Scenario["dm"],
): ReturnType<typeof http.post>[] => [
  http.post(`${DISCORD}/users/@me/channels`, ({ request }) =>
    Effect.runPromise(
      bodyOf(DirectChannelBody, request).pipe(
        Effect.map(({ recipient_id }) => {
          record({ channelId: `dm:${recipient_id}`, content: "" });
          return HttpResponse.json({ id: DM_CHANNEL });
        }),
      ),
    ),
  ),
  http.post(`${DISCORD}/channels/:channelId/messages`, ({ params, request }) => {
    const channelId = String(params["channelId"]);
    if (channelId === DM_CHANNEL && dm === "closed") {
      return HttpResponse.json({ code: CANNOT_DM }, { status: FORBIDDEN });
    }
    return Effect.runPromise(
      bodyOf(MessageBody, request).pipe(
        Effect.map(({ content }) => {
          record({ channelId, content });
          return HttpResponse.json({ id: "1" });
        }),
      ),
    );
  }),
];

const discordWith = ({ guildId, auditLog, dm }: Scenario): Sent[] => {
  const sent: Sent[] = [];
  network.use(
    http.get(`${DISCORD}/users/@me/guilds`, () => HttpResponse.json([{ id: guildId }])),
    http.get(`${DISCORD}/users/@me`, () => HttpResponse.json({ id: BOT })),
    http.get(`${DISCORD}/guilds/:guildId/channels`, () =>
      HttpResponse.json([
        { id: OTHER_CHANNEL, type: 0, name: "general", position: 0, permission_overwrites: [] },
        { id: SYSTEM_CHANNEL, type: 0, name: "welcome", position: 1, permission_overwrites: [] },
      ]),
    ),
    http.get(`${DISCORD}/guilds/:guildId/threads/active`, () => HttpResponse.json({ threads: [] })),
    http.get(`${DISCORD}/channels/:channelId/threads/archived/public`, () =>
      HttpResponse.json({ threads: [], has_more: false }),
    ),
    http.get(`${DISCORD}/guilds/:guildId/members/:userId`, () => HttpResponse.json({ roles: [] })),
    http.get(`${DISCORD}/guilds/:guildId/audit-logs`, () => {
      if (auditLog === "forbidden") {
        return HttpResponse.json({ code: 50_013 }, { status: FORBIDDEN });
      }
      return HttpResponse.json({
        audit_log_entries: [{ target_id: BOT, user_id: INVITER, action_type: 28 }],
      });
    }),
    http.get(`${DISCORD}/guilds/:guildId`, () =>
      HttpResponse.json({
        id: guildId,
        name: "game night",
        owner_id: OWNER,
        system_channel_id: SYSTEM_CHANNEL,
        roles: [{ id: guildId, permissions: "66560" }],
      }),
    ),
    ...outgoing((message) => {
      sent.push(message);
    }, dm),
  );
  return sent;
};

const forget = (guildId: string): Promise<unknown> => db.delete(guild).where(eq(guild.id, guildId));

beforeAll(() => {
  network.enable();
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("a joined server sends the next steps to whoever invited the bot", () =>
  Effect.gen(function* invited() {
    const sent = discordWith({ guildId: "730", auditLog: "readable", dm: "open" });
    yield* syncJoinedGuild("730");
    expect(sent.map(({ channelId }) => channelId)).toStrictEqual([`dm:${INVITER}`, DM_CHANNEL]);
    expect(sent.map(({ content }) => content).join("")).toMatch(
      /mirucord\.masseater\.dev\/dashboard\/730>[\s\S]*mirucord\.masseater\.dev\/mcp>/u,
    );
    yield* Effect.promise(() => forget("730"));
  }),
);

it.effect(
  "without the audit log the owner is told, and a closed DM falls back to the system channel",
  () =>
    Effect.gen(function* fallback() {
      const sent = discordWith({ guildId: "740", auditLog: "forbidden", dm: "closed" });
      yield* syncJoinedGuild("740");
      expect(sent.map(({ channelId }) => channelId)).toStrictEqual([`dm:${OWNER}`, SYSTEM_CHANNEL]);
      yield* Effect.promise(() => forget("740"));
    }),
);

it.effect("a server already known is not welcomed again", () =>
  Effect.gen(function* known() {
    discordWith({ guildId: "750", auditLog: "readable", dm: "open" });
    yield* syncJoinedGuild("750");
    const sent = discordWith({ guildId: "750", auditLog: "readable", dm: "open" });
    yield* syncJoinedGuild("750");
    expect(sent).toStrictEqual([]);
    yield* Effect.promise(() => forget("750"));
  }),
);
