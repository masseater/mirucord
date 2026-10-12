import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";

import { FlowBody } from "./flow-body";

const CHANNEL = "しくみ";

const Flow = (): ReactNode => (
  <ChannelSection id="how">
    <ChannelHeader name={CHANNEL} />
    <FlowBody />
  </ChannelSection>
);

export { Flow };
