import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";

import { FeaturesBody } from "./features-body";

const CHANNEL = "とくちょう";

const Features = (): ReactNode => (
  <ChannelSection id="features">
    <ChannelHeader name={CHANNEL} />
    <FeaturesBody />
  </ChannelSection>
);

export { Features };
