import type { ReactNode } from "react";

import { ChannelSection } from "./channel-section";
import type { Scene } from "./scene";
import { SceneChatter } from "./scene-chatter";
import { SceneEnding } from "./scene-ending";
import { SceneMessage } from "./scene-message";

export const ChannelScene = ({ scene }: Readonly<{ scene: Scene }>): ReactNode => (
  <ChannelSection channel={scene.channel}>
    <SceneMessage scene={scene} />
    <SceneChatter scene={scene} />
    <SceneEnding scene={scene} />
  </ChannelSection>
);
