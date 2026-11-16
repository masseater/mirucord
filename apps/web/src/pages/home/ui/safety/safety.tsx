import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";

import { SafetyBody } from "./safety-body";

const CHANNEL = "あんしん";

export const Safety = (): ReactNode => (
  <ChannelSection id="safety">
    <ChannelHeader name={CHANNEL} />
    <SafetyBody />
  </ChannelSection>
);
