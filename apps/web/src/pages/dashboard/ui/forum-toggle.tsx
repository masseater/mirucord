import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest-messages/index.server";
import { countFormat } from "#/pages/dashboard/model/format";

import { ChannelLabel } from "./channel-label.tsx";
import { ForumDisclosureButton } from "./forum-disclosure-button.tsx";
import { ForumPostPanel } from "./forum-post-panel.tsx";
import { IngestPill } from "./ingest-pill.tsx";

const POSTS = "投稿";
const UNIT = "件";

type ForumChannel = Extract<SettingsChannel, Readonly<{ kind: "forum" }>>;

export const ForumToggle = ({
  guildId,
  channel,
}: Readonly<{ guildId: string; channel: ForumChannel }>): ReactNode => (
  <>
    <ForumDisclosureButton
      channelId={channel.id}
      className="hover:text-dc-bright flex cursor-pointer flex-wrap items-baseline gap-x-2 text-left"
    >
      <ChannelLabel channel={channel} />
      <span className="text-dc-muted text-sm">
        {POSTS} {countFormat.format(channel.posts)} {UNIT}
      </span>
    </ForumDisclosureButton>
    <IngestPill ingest={channel.ingest} />
    <ForumPostPanel guildId={guildId} channelId={channel.id} />
  </>
);
