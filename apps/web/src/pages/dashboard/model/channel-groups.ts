import { Array, Function } from "effect";

import type { GuildSettings, SettingsChannel } from "#/features/ingest/index.server";

const DATA_FIRST_ARITY = 2;

type ChannelGroup = Readonly<{ id: string; name: string; channels: readonly SettingsChannel[] }>;

const UNCATEGORIZED = { id: "", name: "" } as const;

const groupByCategoryDataFirst = (
  settings: GuildSettings,
  channels: readonly SettingsChannel[],
): readonly ChannelGroup[] =>
  [UNCATEGORIZED, ...settings.categories]
    .map(({ id, name }) => ({
      id,
      name,
      channels: channels.filter(({ categoryId }) => categoryId === id),
    }))
    .filter((group) => Array.isReadonlyArrayNonEmpty(group.channels));

const groupByCategory: {
  (channels: readonly SettingsChannel[]): (settings: GuildSettings) => readonly ChannelGroup[];
  (settings: GuildSettings, channels: readonly SettingsChannel[]): readonly ChannelGroup[];
} = Function.dual(DATA_FIRST_ARITY, groupByCategoryDataFirst);

export { groupByCategory };
export type { ChannelGroup };
