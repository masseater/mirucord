import { ChannelType } from "discord-api-types/v10";
import { Match } from "effect";

import { CATEGORY_TYPES } from "#/shared/discord";
import type { ChannelKind } from "#/shared/discord";

const FORUM_TYPES: ReadonlySet<number> = new Set([ChannelType.GuildForum, ChannelType.GuildMedia]);

const VOICE_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
]);

const THREAD_PARENT_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ...FORUM_TYPES,
]);

const LISTED_TYPES: ReadonlySet<number> = new Set([...THREAD_PARENT_TYPES, ...VOICE_TYPES]);

const THREAD_TYPES: ReadonlySet<number> = new Set([
  ChannelType.AnnouncementThread,
  ChannelType.PublicThread,
]);

const MESSAGE_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ...VOICE_TYPES,
  ...THREAD_TYPES,
]);

const STORED_TYPES: ReadonlySet<number> = new Set([
  ...LISTED_TYPES,
  ...THREAD_TYPES,
  ...CATEGORY_TYPES,
]);

const kindOf = (type: number): ChannelKind =>
  Match.value(type).pipe(
    Match.when(ChannelType.GuildAnnouncement, (): ChannelKind => "announcement"),
    Match.when(ChannelType.GuildVoice, (): ChannelKind => "voice"),
    Match.when(ChannelType.GuildStageVoice, (): ChannelKind => "stage"),
    Match.when(
      (candidate: number) => FORUM_TYPES.has(candidate),
      (): ChannelKind => "forum",
    ),
    Match.orElse((): ChannelKind => "text"),
  );

export { kindOf, LISTED_TYPES, MESSAGE_TYPES, STORED_TYPES, THREAD_PARENT_TYPES, VOICE_TYPES };
