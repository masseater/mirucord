import type { ReactNode } from "react";

import { TitledEmbed } from "#/pages/home/ui/message/titled-embed";

import { ChannelList } from "./channel-list";
import { CipherList } from "./cipher-list";
import { OperationChips } from "./operation-chips";

const WRITE = "書きこまない";
const SCOPE = "あなたが読めるチャンネルだけ";
const CIPHER = "本文は暗号化";

const FeatureGrid = (): ReactNode => (
  <div className="grid gap-2">
    <TitledEmbed accent="border-lavender-deep" title={WRITE}>
      <OperationChips />
    </TitledEmbed>
    <TitledEmbed accent="border-mint" title={SCOPE}>
      <ChannelList />
    </TitledEmbed>
    <TitledEmbed accent="border-pink-deep" title={CIPHER}>
      <CipherList />
    </TitledEmbed>
  </div>
);

export { FeatureGrid };
