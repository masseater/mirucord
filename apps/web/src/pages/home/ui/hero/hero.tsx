import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";

import { ChannelTopic } from "./channel-topic";
import { ChannelWelcome } from "./channel-welcome";
import { HeroDemo } from "./hero-demo";

const CHANNEL = "ざつだん";
const TOPIC = "Discord の思い出さがし";
const DATE = "2024年8月12日";

const Hero = (): ReactNode => (
  <section id="top" className="pb-10">
    <ChannelHeader name={CHANNEL}>
      <ChannelTopic topic={TOPIC} />
    </ChannelHeader>
    <ChannelWelcome />
    <div className="text-dc-muted mx-4 mt-6 mb-2 flex items-center gap-2 text-xs font-bold">
      <hr className="border-dc-line grow" />
      {DATE}
      <hr className="border-dc-line grow" />
    </div>
    <HeroDemo />
  </section>
);

export { Hero };
