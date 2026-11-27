import type { ReactNode } from "react";

import { forumPostsId, useForumDisclosure } from "#/pages/dashboard/model/forum-disclosure";

import { ForumChevron } from "./forum-chevron";

export const ForumDisclosureButton = ({
  channelId,
  className,
  children,
}: Readonly<{ channelId: string; className: string; children: ReactNode }>): ReactNode => {
  const { disclosure, toggle } = useForumDisclosure(channelId);
  return (
    <button
      type="button"
      aria-expanded={disclosure.status === "open"}
      aria-controls={forumPostsId(channelId)}
      onClick={toggle}
      className={className}
    >
      <ForumChevron open={disclosure.status === "open"} />
      {children}
    </button>
  );
};
