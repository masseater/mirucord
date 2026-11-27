import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, Effect, pipe, Schema } from "effect";

import { CONSENTS } from "#/entities/scope";
import { DISCORD_UNAVAILABLE, readableGuilds } from "#/entities/scope/index.server";
import { SERVICE_NAME } from "#/shared/config";
import { errorResult, structuredResult, toolRegistration } from "#/shared/mcp";
import { runTraced } from "#/shared/observability/index.server";

const Server = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  ingest: Schema.Literals(CONSENTS).annotate({
    description: "notConsented until the admin allows storing messages; every channel reads empty",
  }),
});

const ListServersOutput = Schema.Struct({ servers: Schema.Array(Server) });

const LIST_SERVERS_TOOL = {
  name: "list_servers",
  title: "List servers",
  description: `List the Discord servers you can read through ${SERVICE_NAME}.`,
  outputSchema: ListServersOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const listServers = (discordUserId: string) => (): Promise<CallToolResult> =>
  runTraced(
    readableGuilds(discordUserId).pipe(
      Effect.flatMap((guilds) =>
        structuredResult({
          servers: pipe(
            guilds,
            Array.map(({ guildId, name, consent }) => ({
              id: guildId,
              name,
              ingest: consent,
            })),
          ),
        } satisfies typeof ListServersOutput.Type),
      ),
      Effect.orElseSucceed(() => errorResult(DISCORD_UNAVAILABLE)),
    ),
  );

export const registerListServers = toolRegistration({ ...LIST_SERVERS_TOOL, handler: listServers });
