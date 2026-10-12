import type { ReactNode } from "react";

import { ChannelHeader } from "#/pages/home/ui/common/channel-header";
import { ChannelSection } from "#/pages/home/ui/common/channel-section";

import { FaqBody } from "./faq-body";

const CHANNEL = "よくある質問";

const Faq = (): ReactNode => (
  <ChannelSection id="faq">
    <ChannelHeader name={CHANNEL} />
    <FaqBody />
  </ChannelSection>
);

export { Faq };
