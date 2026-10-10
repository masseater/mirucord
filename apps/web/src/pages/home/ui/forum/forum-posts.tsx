import type { ReactNode } from "react";

import { MEMBERS } from "#/pages/home/ui/common/members";

import { ForumPost } from "./forum-post";

const POSTS = [
  {
    tags: [
      { emoji: "⛺", label: "キャンプ" },
      { emoji: "📌", label: "決定" },
    ],
    title: "夏キャンプのしおり",
    member: MEMBERS.kenta,
    preview: "集合は駅に 9 時、テントは 2 つ持っていく",
    replies: 42,
    ago: "昨日",
  },
  {
    tags: [{ emoji: "🍛", label: "ごはん" }],
    title: "キャンプ飯レシピまとめ",
    member: MEMBERS.miho,
    preview: "カレーは弱火でじっくり（たなか用）",
    replies: 18,
    ago: "3 日前",
  },
  {
    tags: [
      { emoji: "📷", label: "写真" },
      { emoji: "❓", label: "質問" },
    ],
    title: "星空ってどう撮るの？",
    member: MEMBERS.yui,
    preview: "スマホでもいける？三脚いる？",
    replies: 9,
    ago: "1 週間前",
  },
] as const;

const ForumPosts = (): ReactNode => (
  <ul className="mt-1 grid max-w-xl gap-2">
    {POSTS.map((post) => (
      <ForumPost
        key={post.title}
        tags={post.tags}
        title={post.title}
        member={post.member}
        preview={post.preview}
        replies={post.replies}
        ago={post.ago}
      />
    ))}
  </ul>
);

export { ForumPosts };
