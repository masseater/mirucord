import { ChannelType } from "discord-api-types/v10";

type ChannelKind = "text" | "announcement" | "voice" | "stage" | "forum";

const CATEGORY_TYPES: ReadonlySet<number> = new Set([ChannelType.GuildCategory]);

const THREAD_TYPES: ReadonlySet<number> = new Set([
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
]);

export { CATEGORY_TYPES, THREAD_TYPES };
export type { ChannelKind };
