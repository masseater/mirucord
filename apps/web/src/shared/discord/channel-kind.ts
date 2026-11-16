import { ChannelType } from "discord-api-types/v10";

export type ChannelKind = "text" | "announcement" | "voice" | "stage" | "forum";

export const CATEGORY_TYPES: ReadonlySet<ChannelType> = new Set([ChannelType.GuildCategory]);

export const FORUM_TYPES: ReadonlySet<ChannelType> = new Set([
  ChannelType.GuildForum,
  ChannelType.GuildMedia,
]);

export const THREAD_TYPES: ReadonlySet<ChannelType> = new Set([
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
]);
