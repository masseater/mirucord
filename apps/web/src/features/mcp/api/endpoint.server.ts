import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { Effect, Option } from "effect";

import { auth } from "#/shared/auth/index.server";
import { MCP_URL } from "#/shared/config";
import { runRequest } from "#/shared/lib/index.server";

import { discordUserIdOf } from "./scope.server";
import { buildServer } from "./tools.server";

const FORBIDDEN = 403;

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
