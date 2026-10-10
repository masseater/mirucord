import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { and, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { account, auth } from "#/shared/auth/index.server";
import { MCP_URL } from "#/shared/config";
import { db } from "#/shared/db/index.server";
import { runRequest } from "#/shared/lib/index.server";

import { buildServer } from "./tools.server";

const FORBIDDEN = 403;
const DISCORD_PROVIDER = "discord";

const discordUserIdOf = (userId: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    db
      .select({ accountId: account.accountId })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, DISCORD_PROVIDER))),
  ).pipe(Effect.map((rows) => Option.map(Array.head(rows), ({ accountId }) => accountId)));

const notLinked = (): Response =>
  new Response("This account is not linked to Discord", { status: FORBIDDEN });

const linkedDiscordUser = (userId: Option.Option<string>): Effect.Effect<Option.Option<string>> =>
  Option.match(userId, {
    onNone: () => Effect.succeedNone,
    onSome: discordUserIdOf,
  });

const respond = (request: Request, discordUserId: Option.Option<string>): Effect.Effect<Response> =>
  Option.match(discordUserId, {
    onNone: () => Effect.succeed(notLinked()),
    onSome: (linked) =>
      Effect.promise(() => createMcpHandler(() => buildServer(linked)).fetch(request)),
  });

const serveMcp = requireMcpAuth(
  auth,
  (request, claims) =>
    runRequest(
      linkedDiscordUser(Option.fromNullishOr(claims.sub)).pipe(
        Effect.flatMap((discordUserId) => respond(request, discordUserId)),
      ),
    ),
  { resource: MCP_URL },
);

export { serveMcp };
