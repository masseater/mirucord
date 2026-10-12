import { env } from "cloudflare:workers";

import type { GuildStore } from "./api/guild-store.server";

const guildStore = (guildId: string): DurableObjectStub<GuildStore> =>
  env.GUILD_STORE.getByName(guildId);

export { guildStore };
export { GuildStore } from "./api/guild-store.server";
export type { IndexedMessage, SealedMessage, StoredRow } from "./api/guild-store.server";
export {
  containsQuery,
  indexTokens,
  queryTokens,
  searchableTexts,
} from "./lib/search-tokens.server";
