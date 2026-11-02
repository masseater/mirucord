import { DateTime, Effect } from "effect";
import { http, HttpResponse } from "msw";

import { account, user } from "#/shared/auth/generated/auth.table";
import { db } from "#/shared/db/index.server";

const OWNER = { userId: "linked-user", discordUserId: "701" };
const ACCESS_TOKEN = "connections-token";
const EXPIRES_AT = DateTime.toDate(DateTime.makeUnsafe("2099-01-01T00:00:00Z"));
const DISCORD_API = "https://discord.com/api/v10";

const CONNECTIONS = [
  { type: "github", name: "alice", verified: true, visibility: 1 },
  { type: "steam", name: "hidden", verified: false, visibility: 0 },
  { type: "twitter", name: "gone", verified: true, visibility: 1, revoked: true },
  { type: "youtube", name: "alice-tube", verified: false, visibility: 1 },
];

const seedConnectionsAccount = (): Effect.Effect<void> =>
  Effect.promise(() =>
    db.batch([
      db.insert(user).values({
        id: OWNER.userId,
        name: OWNER.userId,
        email: `${OWNER.discordUserId}@users.discord.invalid`,
      }),
      db.insert(account).values({
        id: "linked-account-row",
        accountId: OWNER.discordUserId,
        providerId: "discord",
        userId: OWNER.userId,
        accessToken: ACCESS_TOKEN,
        accessTokenExpiresAt: EXPIRES_AT,
        scope: "identify,connections",
      }),
    ]),
  ).pipe(Effect.asVoid);

const revoked: FormDataEntryValue[] = [];

const discordConnections = [
  http.get(`${DISCORD_API}/users/@me/connections`, () => HttpResponse.json(CONNECTIONS)),
  http.post(`${DISCORD_API}/oauth2/token/revoke`, ({ request }) =>
    Effect.runPromise(
      Effect.promise(() => request.formData()).pipe(
        Effect.map((form) => {
          revoked.push(...form.getAll("token"));
          return HttpResponse.json({});
        }),
      ),
    ),
  ),
];

export { ACCESS_TOKEN, discordConnections, OWNER, revoked, seedConnectionsAccount };
