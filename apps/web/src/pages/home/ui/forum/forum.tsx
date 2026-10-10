import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { Post } from "#/pages/home/ui/message/post";

import { ForumPosts } from "./forum-posts";

const LEAD = "フォーラムの投稿も";
const TAIL = "ミルが返信まで読むよ";
const GUIDE = "フォーラムもまかせてね！";
const CHANNEL = "キャンプ部";
const TIME = "今日 21:01";

const Forum = (): ReactNode => (
  <ChannelSection id="forum" name={CHANNEL} kind="forum">
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <ForumPosts />
    </Post>
  </ChannelSection>
);

export { Forum };
