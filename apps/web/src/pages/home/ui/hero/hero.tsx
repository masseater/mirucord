import type { ReactNode } from "react";

import { CHANNELS } from "#/pages/home/ui/client/channels";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";

import { AnswerWindow } from "./answer-window";
import { ChannelWelcome } from "./channel-welcome";
import { ChatLog } from "./chat-log";

const [CHANNEL] = CHANNELS;
const DATE = "2024年8月12日";

const Hero = (): ReactNode => (
  <ChannelSection id={CHANNEL.id} name={CHANNEL.name} topic={CHANNEL.topic}>
    <ChannelWelcome />
    <div className="text-dc-muted mx-4 mt-6 mb-2 flex items-center gap-2 text-xs font-bold">
      <hr className="border-dc-line grow" />
      {DATE}
      <hr className="border-dc-line grow" />
    </div>
    <div className="xl:grid xl:grid-cols-2 xl:items-center">
      <ChatLog />
      <AnswerWindow />
    </div>
  </ChannelSection>
);

export { Hero };
