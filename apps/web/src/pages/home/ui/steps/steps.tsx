import type { ReactNode } from "react";

import { ChannelSection } from "#/pages/home/ui/common/channel-section";
import { BOT } from "#/pages/home/ui/message/author";
import { Post } from "#/pages/home/ui/message/post";
import { SystemMessage } from "#/pages/home/ui/message/system-message";

import { StepList } from "./step-list";

const LEAD = "3 ステップで";
const TAIL = "すぐ使えるよ";
const GUIDE = "たった 3 つだよ！";
const CHANNEL = "はじめかた";
const TIME = "今日 21:03";
const JOINED = "がサーバーに参加しました。";

const Steps = (): ReactNode => (
  <ChannelSection id="start" name={CHANNEL}>
    <Post time={TIME} guide={GUIDE} lead={LEAD} tail={TAIL}>
      <StepList />
    </Post>
    <SystemMessage kind="join" actor={BOT} text={JOINED} time={TIME} />
  </ChannelSection>
);

export { Steps };
