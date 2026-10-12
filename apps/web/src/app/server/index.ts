import handler from "@tanstack/react-start/server-entry";
import { Boolean, Effect } from "effect";

import { SYNC_CRON } from "#/features/ingest";
import {
  ingestDeliveries,
  pollGuilds,
  startMigration,
  syncGuilds,
} from "#/features/ingest/index.server";
import { serveMcp } from "#/features/mcp/index.server";
import { alertOperators } from "#/shared/alert/index.server";
import { MCP_URL } from "#/shared/config";

const MCP_PATH = new URL(MCP_URL).pathname;

const SYNC_FAILED = "Guild sync could not list servers from Discord";

const runCron = (cron: string): Effect.Effect<void> =>
  Boolean.match(cron === SYNC_CRON, {
    onTrue: () => syncGuilds,
    onFalse: () => pollGuilds.pipe(Effect.andThen(startMigration)),
  }).pipe(Effect.catchTag("DiscordRequestError", () => alertOperators(SYNC_FAILED)));

const worker: ExportedHandler = {
  fetch: (request): Response | Promise<Response> =>
    Boolean.match(new URL(request.url).pathname === MCP_PATH, {
      onTrue: () => serveMcp(request),
      onFalse: () => handler.fetch(request),
    }),
  scheduled: (controller): Promise<void> => Effect.runPromise(runCron(controller.cron)),
  queue: (batch): Promise<void> => Effect.runPromise(ingestDeliveries(batch.messages)),
};

export { GuildStore } from "#/entities/guild-message/index.server";
export default worker;
