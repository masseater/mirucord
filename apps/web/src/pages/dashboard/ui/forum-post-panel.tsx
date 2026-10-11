import type { ReactNode } from "react";

import { forumPostsId, useForumDisclosure } from "#/pages/dashboard/model/forum-disclosure";

import { ForumPostList } from "./forum-post-list";

const ForumPostPanel = ({
  guildId,
  channelId,
}: Readonly<{ guildId: string; channelId: string }>): ReactNode => {
  const { disclosure } = useForumDisclosure(channelId);
  return (
    <div
      id={forumPostsId(channelId)}
      hidden={disclosure.status === "closed"}
      className="border-line basis-full border-l-2 py-1 pl-4"
    >
      {disclosure.status === "open" && <ForumPostList guildId={guildId} channelId={channelId} />}
    </div>
  );
};

export { ForumPostPanel };
