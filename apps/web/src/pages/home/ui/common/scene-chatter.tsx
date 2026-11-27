import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { Message } from "#/pages/home/ui/message/message";
import { Reactions } from "#/pages/home/ui/message/reactions";

import type { Scene } from "./scene";

export const SceneChatter = ({ scene }: Readonly<{ scene: Scene }>): ReactNode =>
  scene.chatter && (
    <div>
      {pipe(
        scene.chatter,
        Array.map((line) => (
          <Message key={line.text} author={line.author} time={scene.time} reply={line.reply}>
            <p>{line.text}</p>
            <Reactions items={line.reactions} />
          </Message>
        )),
      )}
    </div>
  );
