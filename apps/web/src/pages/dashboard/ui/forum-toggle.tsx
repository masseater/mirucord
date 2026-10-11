import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { forumPostsId, useForumDisclosure } from "#/pages/dashboard/model/forum-disclosure";

import { ChannelLabel } from "./channel-label";
import { ForumChevron } from "./forum-chevron";
import { ForumPostPanel } from "./forum-post-panel";
import { IngestPill } from "./ingest-pill";

const POSTS = "投稿";
const UNIT = "件";

type ForumChannel = Extract<SettingsChannel, Readonly<{ kind: "forum" }>>;

const ForumToggle = ({
  guildId,
  channel,
}: Readonly<{ guildId: string; channel: ForumChannel }>): ReactNode => {
  const { disclosure, toggle } = useForumDisclosure(channel.id);
  return (
    <>
      <button
        type="button"
        aria-expanded={disclosure.status === "open"}
        aria-controls={forumPostsId(channel.id)}
        onClick={toggle}
        className="hover:text-grape flex cursor-pointer flex-wrap items-baseline gap-x-2 text-left"
      >
        <ForumChevron open={disclosure.status === "open"} />
        <ChannelLabel channel={channel} />
        <span className="text-ink-soft text-sm">
          {POSTS} {channel.posts.toLocaleString("ja-JP")} {UNIT}
        </span>
      </button>
      <IngestPill ingest={channel.ingest} />
      <ForumPostPanel guildId={guildId} channelId={channel.id} />
    </>
  );
};

export { ForumToggle };
