import { run } from "@r_masseater/workers-tracing/effect";
import { env } from "cloudflare:workers";
import { ConnectionService, ConnectionVisibility } from "discord-api-types/v10";
import type { APIConnection, RESTGetAPICurrentUserConnectionsResult } from "discord-api-types/v10";
import { DateTime, Effect } from "effect";
import { http, HttpResponse } from "msw";

const OWNER = { userId: "linked-user", discordUserId: "701" };
const ACCESS_TOKEN = "connections-token";
const EXPIRES_AT = DateTime.toEpochMillis(DateTime.makeUnsafe("2099-01-01T00:00:00Z"));
const SEEDED_AT = DateTime.toEpochMillis(DateTime.makeUnsafe("2026-11-01T00:00:00Z"));
const DISCORD_API = "https://discord.com/api/v10";

const connectionOf = (
  type: ConnectionService,
  name: string,
  visibility: ConnectionVisibility,
): APIConnection => ({
  id: `${type}-${name}`,
  type,
  name,
  verified: type === ConnectionService.GitHub,
  friend_sync: false,
  show_activity: false,
  two_way_link: false,
  visibility,
});

const CONNECTIONS: RESTGetAPICurrentUserConnectionsResult = [
  connectionOf(ConnectionService.GitHub, "alice", ConnectionVisibility.Everyone),
  connectionOf(ConnectionService.Steam, "hidden", ConnectionVisibility.None),
  { ...connectionOf(ConnectionService.X, "gone", ConnectionVisibility.Everyone), revoked: true },
  connectionOf(ConnectionService.YouTube, "alice-tube", ConnectionVisibility.Everyone),
];

const INSERT_USER =
  "INSERT INTO user (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)";
const INSERT_ACCOUNT =
  "INSERT INTO account (id, account_id, provider_id, user_id, access_token, access_token_expires_at, scope, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
const SELECT_TOKEN = "SELECT access_token AS accessToken, scope FROM account WHERE user_id = ?";

const seedConnectionsAccount = (): Effect.Effect<void> =>
  Effect.promise(() =>
    env.DB.batch([
      env.DB.prepare(INSERT_USER).bind(
        OWNER.userId,
        OWNER.userId,
        `${OWNER.discordUserId}@users.discord.invalid`,
        SEEDED_AT,
        SEEDED_AT,
      ),
      env.DB.prepare(INSERT_ACCOUNT).bind(
        "linked-account-row",
        OWNER.discordUserId,
        "discord",
        OWNER.userId,
        ACCESS_TOKEN,
        EXPIRES_AT,
        "identify,connections",
        SEEDED_AT,
        SEEDED_AT,
      ),
    ]),
  ).pipe(Effect.asVoid);

const storedToken = Effect.promise(() =>
  env.DB.prepare(SELECT_TOKEN).bind(OWNER.userId).all(),
).pipe(Effect.map(({ results }) => results));

const revoked: FormDataEntryValue[] = [];

const discordConnections = [
  http.get(`${DISCORD_API}/users/@me/connections`, () => HttpResponse.json(CONNECTIONS)),
  http.post(`${DISCORD_API}/oauth2/token/revoke`, ({ request }) =>
    run(
      Effect.promise(() => request.formData()).pipe(
        Effect.map((form) => {
          revoked.push(...form.getAll("token"));
          return HttpResponse.json({});
        }),
      ),
    ),
  ),
];

export { ACCESS_TOKEN, discordConnections, OWNER, revoked, seedConnectionsAccount, storedToken };
