import type { ReactNode } from "react";

import { ChannelList } from "./channel-list";
import { CipherList } from "./cipher-list";
import { FeatureCell } from "./feature-cell";
import { OperationChips } from "./operation-chips";

const WRITE = "書きこまない";
const SCOPE_LEAD = "あなたが読める";
const SCOPE_TAIL = "チャンネルだけ";
const CIPHER = "本文は暗号化";

const FeatureGrid = (): ReactNode => (
  <div className="grid gap-6 md:grid-cols-3">
    <FeatureCell number="1" lead={WRITE} className="bg-lavender">
      <OperationChips />
    </FeatureCell>
    <FeatureCell number="2" lead={SCOPE_LEAD} tail={SCOPE_TAIL} className="bg-sky">
      <ChannelList />
    </FeatureCell>
    <FeatureCell number="3" lead={CIPHER} className="bg-pink">
      <CipherList />
    </FeatureCell>
  </div>
);

export { FeatureGrid };
