import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";

import { ChannelTopic } from "./channel-topic";
import { ChannelWelcome } from "./channel-welcome";
import { DateDivider } from "./date-divider";
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
    <DateDivider date={DATE} />
    <HeroDemo />
  </section>
);

export { Hero };
