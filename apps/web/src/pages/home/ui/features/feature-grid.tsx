import type { ReactNode } from "react";

import { EmbedStack } from "#/pages/home/ui/message/embed-stack";
import type { EmbedItem } from "#/pages/home/ui/message/embed-stack";

import { ChannelList } from "./channel-list.tsx";
import { CipherList } from "./cipher-list.tsx";
import { OperationChips } from "./operation-chips.tsx";

const ITEMS: readonly EmbedItem[] = [
  { accent: "border-lavender-deep", title: "書きこまない", body: <OperationChips /> },
  { accent: "border-mint", title: "あなたが読めるチャンネルだけ", body: <ChannelList /> },
  { accent: "border-pink-deep", title: "本文は暗号化", body: <CipherList /> },
];

export const FeatureGrid = (): ReactNode => <EmbedStack tag="ul" items={ITEMS} />;
