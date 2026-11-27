import type { ReactNode } from "react";

import { BOT } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";
import { PostHeading } from "#/pages/home/ui/message/post-heading";
import { Reactions } from "#/pages/home/ui/message/reactions";

import type { Scene } from "./scene";

export const SceneMessage = ({ scene }: Readonly<{ scene: Scene }>): ReactNode => (
  <Message author={scene.author ?? BOT} time={scene.time}>
    <PostHeading heading={scene.heading} />
    {scene.figure}
    {scene.reactions && <Reactions items={scene.reactions} />}
  </Message>
);
