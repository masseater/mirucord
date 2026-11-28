import { env } from "cloudflare:workers";

import { OBJECT_LOCATION } from "#/shared/config";

import type { GuildArchive } from "./guild-archive.server.ts";

export const guildStore = (guildId: string): DurableObjectStub<GuildArchive> =>
  env.GUILD_ARCHIVE.getByName(guildId, OBJECT_LOCATION);
