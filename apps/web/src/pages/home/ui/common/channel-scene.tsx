import type { ReactNode } from "react";

import { ChannelSection } from "./channel-section.tsx";
import { SceneChatter } from "./scene-chatter.tsx";
import { SceneEnding } from "./scene-ending.tsx";
import { SceneMessage } from "./scene-message.tsx";
import type { Scene } from "./scene.ts";

export const ChannelScene = ({ scene }: Readonly<{ scene: Scene }>): ReactNode => (
  <ChannelSection channel={scene.channel}>
    <SceneMessage scene={scene} />
    <SceneChatter scene={scene} />
    <SceneEnding scene={scene} />
  </ChannelSection>
);
