import type { Scene } from "#/pages/home/ui/common/channel-scene";
import { FAQ_CHANNEL } from "#/pages/home/ui/common/channels";

import { FaqThread } from "./faq-thread";

export const FAQ_SCENE: Scene = {
  channel: FAQ_CHANNEL,
  time: "今日 21:05",
  heading: { guide: "なんでも聞いてね！", lead: "よくある質問" },
  after: <FaqThread />,
};
