import { env } from "cloudflare:workers";

import type { GuildStore } from "./guild-store.server";

export const guildStore = (guildId: string): DurableObjectStub<GuildStore> =>
  env.GUILD_STORE.getByName(guildId);
