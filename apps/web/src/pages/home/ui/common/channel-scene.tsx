import type { ReactNode } from "react";

import { ChannelSection } from "./channel-section";
import type { Scene } from "./scene";
import { SceneChatter } from "./scene-chatter";
import { SceneMessage } from "./scene-message";
import { SceneSystem } from "./scene-system";

export const ChannelScene = ({ scene }: Readonly<{ scene: Scene }>): ReactNode => (
  <ChannelSection channel={scene.channel}>
    <SceneMessage scene={scene} />
    <SceneChatter scene={scene} />
    <SceneSystem scene={scene} />
    {scene.after}
  </ChannelSection>
);
