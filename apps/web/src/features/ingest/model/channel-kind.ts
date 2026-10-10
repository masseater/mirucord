import { ChannelType } from "discord-api-types/v10";
import { Boolean } from "effect";

type ChannelKind = "text" | "forum";

const FORUM_TYPES: ReadonlySet<number> = new Set([ChannelType.GuildForum, ChannelType.GuildMedia]);

const THREAD_PARENT_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ...FORUM_TYPES,
]);

const STORED_TYPES: ReadonlySet<number> = new Set([
  ...THREAD_PARENT_TYPES,
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
]);

const kindOf = (type: number): ChannelKind =>
  Boolean.match(FORUM_TYPES.has(type), {
    onTrue: (): ChannelKind => "forum",
    onFalse: (): ChannelKind => "text",
  });

export { FORUM_TYPES, kindOf, STORED_TYPES, THREAD_PARENT_TYPES };
export type { ChannelKind };
