import { env } from "cloudflare:workers";

import type { GuildStore } from "./guild-store.server";

const guildStore = (guildId: string): DurableObjectStub<GuildStore> =>
  env.GUILD_STORE.getByName(guildId);

export { guildStore };
export { GuildStore } from "./guild-store.server";
export type { IndexedMessage, SealedMessage, StoredRow } from "./guild-store.server";
