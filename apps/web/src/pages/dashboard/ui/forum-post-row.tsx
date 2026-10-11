import type { ReactNode } from "react";

import type { ForumPost } from "#/features/ingest/index.server";

import { IngestPill } from "./ingest-pill";

const MESSAGES = "メッセージ";
const UNIT = "件";

const ForumPostRow = ({ post }: Readonly<{ post: ForumPost }>): ReactNode => (
  <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm font-bold">
    {post.name}
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-ink-soft">
        {MESSAGES} {post.messages.toLocaleString("ja-JP")} {UNIT}
      </span>
      <IngestPill ingest={post.ingest} />
    </span>
  </li>
);

export { ForumPostRow };
