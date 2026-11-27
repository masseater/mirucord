import { Match } from "effect";
import type { ReactNode } from "react";

import { SystemMessage } from "#/pages/home/ui/message/system-message";

import type { Scene } from "./scene";

export const SceneEnding = ({ scene }: Readonly<{ scene: Scene }>): ReactNode =>
  Match.value(scene.ending).pipe(
    Match.when({ kind: "none" }, () => false),
    Match.when({ kind: "system" }, (ending) => (
      <SystemMessage
        kind={ending.event}
        actor={ending.actor}
        text={ending.text}
        time={scene.time}
      />
    )),
    Match.when({ kind: "content" }, (ending) => ending.content),
    Match.exhaustive,
  );
