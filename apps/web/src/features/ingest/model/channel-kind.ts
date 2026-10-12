import { ChannelType } from "discord-api-types/v10";
import { Match } from "effect";

import { CATEGORY_TYPES, FORUM_TYPES, THREAD_TYPES } from "#/shared/discord";
import type { ChannelKind } from "#/shared/discord";

const VOICE_TYPES: ReadonlySet<ChannelType> = new Set([
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
]);

const TEXT_TYPES: ReadonlySet<ChannelType> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
]);

const THREAD_PARENT_TYPES: ReadonlySet<ChannelType> = new Set([...TEXT_TYPES, ...FORUM_TYPES]);

const LISTED_TYPES: ReadonlySet<ChannelType> = new Set([...THREAD_PARENT_TYPES, ...VOICE_TYPES]);

const MESSAGE_TYPES: ReadonlySet<ChannelType> = new Set([
  ...TEXT_TYPES,
  ...VOICE_TYPES,
  ...THREAD_TYPES,
]);

const STORED_TYPES: ReadonlySet<ChannelType> = new Set([
  ...LISTED_TYPES,
  ...THREAD_TYPES,
  ...CATEGORY_TYPES,
]);

const kindOf = (type: ChannelType): ChannelKind =>
  Match.value(type).pipe(
    Match.when(ChannelType.GuildAnnouncement, (): ChannelKind => "announcement"),
    Match.when(ChannelType.GuildVoice, (): ChannelKind => "voice"),
    Match.when(ChannelType.GuildStageVoice, (): ChannelKind => "stage"),
    Match.when(
      (candidate: ChannelType) => FORUM_TYPES.has(candidate),
      (): ChannelKind => "forum",
    ),
    Match.orElse((): ChannelKind => "text"),
  );

export {
  kindOf,
  LISTED_TYPES,
  MESSAGE_TYPES,
  STORED_TYPES,
  TEXT_TYPES,
  THREAD_PARENT_TYPES,
  VOICE_TYPES,
};
