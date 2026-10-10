import type { ReactNode } from "react";

import { ChannelTopic } from "#/pages/home/ui/client/channel-topic";
import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { DateDivider } from "#/pages/home/ui/message/date-divider";

import { AnswerWindow } from "./answer-window";
import { ChannelWelcome } from "./channel-welcome";
import { ChatLog } from "./chat-log";

const CHANNEL = "ざつだん";
const TOPIC = "Discord の思い出さがし";
const DATE = "2024年8月12日";

const Hero = (): ReactNode => (
  <section id="top" className="pb-10">
    <ChannelHeader name={CHANNEL}>
      <ChannelTopic topic={TOPIC} />
    </ChannelHeader>
    <ChannelWelcome />
    <DateDivider date={DATE} />
    <ChatLog />
    <AnswerWindow />
  </section>
);

export { Hero };
