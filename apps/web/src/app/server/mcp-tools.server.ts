import {
  registerGetServer,
  registerListChannels,
  registerListServerPhrases,
} from "#/features/get-server/index.server";
import { registerListServers } from "#/features/list-servers/index.server";
import { registerReadMessages } from "#/features/read-messages/index.server";
import {
  registerFindMessages,
  registerFindSimilarMessages,
  registerSearchMessages,
} from "#/features/search-messages/index.server";
import { serverWith } from "#/shared/mcp";

import { RELATION_TOOLS } from "./mcp-relation-tools.server.ts";

export const buildServer = serverWith([
  ...RELATION_TOOLS,
  registerListServers,
  registerGetServer,
  registerSearchMessages,
  registerReadMessages,
  registerListChannels,
  registerListServerPhrases,
  registerFindMessages,
  registerFindSimilarMessages,
]);
