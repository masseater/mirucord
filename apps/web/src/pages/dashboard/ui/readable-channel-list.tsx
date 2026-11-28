import type { ReactNode } from "react";

import type { GuildSettings, SettingsChannel } from "#/features/ingest-messages/index.server";
import { MASCOT_NAME } from "#/shared/config";

import { BlindChannelNote } from "./blind-channel-note.tsx";
import { ChannelGroups } from "./channel-groups.tsx";

const TITLE = `${MASCOT_NAME}が見られるチャンネル`;

type Props = Readonly<{ settings: GuildSettings; channels: readonly SettingsChannel[] }>;

export const ReadableChannelList = ({ settings, channels }: Props): ReactNode => (
  <>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    <ChannelGroups settings={settings} channels={channels} />
    <BlindChannelNote channels={channels} />
  </>
);
