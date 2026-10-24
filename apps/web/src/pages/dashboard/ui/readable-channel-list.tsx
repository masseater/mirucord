import type { ReactNode } from "react";

import type { GuildSettings, SettingsChannel } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";

import { BlindChannelNote } from "./blind-channel-note";
import { ChannelGroups } from "./channel-groups";

const TITLE = `${MASCOT_NAME}が見られるチャンネル`;

type Props = Readonly<{ settings: GuildSettings; channels: readonly SettingsChannel[] }>;

const ReadableChannelList = ({ settings, channels }: Props): ReactNode => (
  <>
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    <ChannelGroups settings={settings} channels={channels} />
    <BlindChannelNote channels={channels} />
  </>
);

export { ReadableChannelList };
