import { ChannelType } from "discord-api-types/v10";

type ChannelKind = "text" | "announcement" | "voice" | "stage" | "forum";

const CATEGORY_TYPES: ReadonlySet<number> = new Set([ChannelType.GuildCategory]);

export { CATEGORY_TYPES };
export type { ChannelKind };
