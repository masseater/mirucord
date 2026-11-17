import { registerFindMessages } from "#/features/find-messages/index.server";
import { registerFindSimilarMessages } from "#/features/find-similar-messages/index.server";
import { registerListChannels } from "#/features/list-channels/index.server";
import { registerListServerPhrases } from "#/features/list-server-phrases/index.server";
import { registerListServers } from "#/features/list-servers/index.server";
import { registerReadMessages } from "#/features/read-messages/index.server";
import { serverWith } from "#/shared/mcp";

import { RELATION_TOOLS } from "./mcp-relation-tools.server";

export const buildServer = serverWith([
  ...RELATION_TOOLS,
  registerListServers,
  registerListChannels,
  registerListServerPhrases,
  registerFindMessages,
  registerFindSimilarMessages,
  registerReadMessages,
]);
