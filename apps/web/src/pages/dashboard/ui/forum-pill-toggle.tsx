import type { ReactNode } from "react";

import type { SettingsChannel } from "#/features/ingest/index.server";
import { forumPostsId, useForumDisclosure } from "#/pages/dashboard/model/forum-disclosure";

import { ChannelLabel } from "./channel-label";
import { ForumChevron } from "./forum-chevron";

const ForumPillToggle = ({ channel }: Readonly<{ channel: SettingsChannel }>): ReactNode => {
  const { disclosure, toggle } = useForumDisclosure(channel.id);
  return (
    <button
      type="button"
      aria-expanded={disclosure.status === "open"}
      aria-controls={forumPostsId(channel.id)}
      onClick={toggle}
      className="bg-dc-active text-dc-text hover:bg-dc-line inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold"
    >
      <ForumChevron open={disclosure.status === "open"} />
      <ChannelLabel channel={channel} />
    </button>
  );
};

export { ForumPillToggle };
