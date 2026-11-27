import type { ReactNode } from "react";

import { SystemMessage } from "#/pages/home/ui/message/system-message";

import type { Scene } from "./scene";

export const SceneSystem = ({ scene }: Readonly<{ scene: Scene }>): ReactNode =>
  scene.system && (
    <SystemMessage
      kind={scene.system.kind}
      actor={scene.system.actor}
      text={scene.system.text}
      time={scene.time}
    />
  );
