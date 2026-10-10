import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { MEMBERS } from "#/pages/home/ui/common/members";
import { memberAuthor } from "#/pages/home/ui/message/author";
import { Post } from "#/pages/home/ui/message/post";
import { SystemMessage } from "#/pages/home/ui/message/system-message";

import { SpecList } from "./spec-list";

const LEAD = "大事な思い出だから";
const TAIL = "ていねいに預かるよ";
const GUIDE = "安心してね！";
const CHANNEL = "あんしん";
const TIME = "今日 21:04";
const PINNED = "がメッセージをこのチャンネルにピン留めしました。";

const Safety = (): ReactNode => (
  <ChannelSection id="safety" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <SpecList />
    </Post>
    <SystemMessage kind="pin" actor={memberAuthor(MEMBERS.miho)} text={PINNED} time={TIME} />
  </ChannelSection>
);

export { Safety };
