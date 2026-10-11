import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { forumPostsQuery } from "#/pages/dashboard/api/dashboard";

import { ForumPostRow } from "./forum-post-row";
import { forumPostsNote, forumPostsViewOf } from "./forum-posts-view";

const ForumPostList = ({
  guildId,
  channelId,
}: Readonly<{ guildId: string; channelId: string }>): ReactNode => {
  const view = forumPostsViewOf(useQuery(forumPostsQuery({ guildId, channelId })));
  if (view.status !== "listed") {
    return (
      <p aria-live="polite" className="text-ink-soft text-sm font-bold">
        {forumPostsNote(view)}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {view.posts.map((post) => (
        <ForumPostRow key={post.id} post={post} />
      ))}
    </ul>
  );
};

export { ForumPostList };
