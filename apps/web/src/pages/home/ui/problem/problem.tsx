import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";

import { ProblemBody } from "./problem-body";

const CHANNEL = "思い出";

const Problem = (): ReactNode => (
  <ChannelSection id="why">
    <ChannelHeader name={CHANNEL} />
    <ProblemBody />
  </ChannelSection>
);

export { Problem };
