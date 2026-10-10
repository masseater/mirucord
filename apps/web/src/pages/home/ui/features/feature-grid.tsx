import type { ReactNode } from "react";

import { ChannelList } from "./channel-list";
import { CipherList } from "./cipher-list";
import { FeatureCell } from "./feature-cell";
import { OperationChips } from "./operation-chips";

const WRITE = "書き込まない";
const SCOPE_LEAD = "あなたが読める";
const SCOPE_TAIL = "チャンネルだけ";
const CIPHER = "本文は暗号化";

const FeatureGrid = (): ReactNode => (
  <div className="grid gap-4 md:grid-cols-2">
    <FeatureCell number="一" lead={WRITE} className="bg-sumi text-paper">
      <OperationChips />
    </FeatureCell>
    <FeatureCell
      number="二"
      lead={SCOPE_LEAD}
      tail={SCOPE_TAIL}
      className="border-kinu bg-paper border"
    >
      <ChannelList />
    </FeatureCell>
    <FeatureCell number="三" lead={CIPHER} className="bg-shu text-paper md:col-span-2 md:min-h-56">
      <CipherList />
    </FeatureCell>
  </div>
);

export { FeatureGrid };
