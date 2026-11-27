import type { ReactNode } from "react";

import { BOT } from "#/pages/home/ui/message/author";
import type { Author } from "#/pages/home/ui/message/author";
import { Chatter } from "#/pages/home/ui/message/chatter";
import type { ChatLine } from "#/pages/home/ui/message/chatter";
import { Message } from "#/pages/home/ui/message/message";
import { PostHeading } from "#/pages/home/ui/message/post-heading";
import type { Heading } from "#/pages/home/ui/message/post-heading";
import { Reactions } from "#/pages/home/ui/message/reactions";
import type { Reaction } from "#/pages/home/ui/message/reactions";
import { SystemMessage } from "#/pages/home/ui/message/system-message";

import { ChannelSection } from "./channel-section";
import type { Channel } from "./channels";

export type Scene = Readonly<{
  channel: Channel;
  time: string;
  heading: Heading;
  author?: Author;
  figure?: ReactNode;
  reactions?: readonly Reaction[];
  chatter?: readonly ChatLine[];
  system?: Readonly<{ kind: "join" | "pin"; actor: Author; text: string }>;
  after?: ReactNode;
}>;

export const ChannelScene = ({ scene }: Readonly<{ scene: Scene }>): ReactNode => (
  <ChannelSection channel={scene.channel}>
    <Message author={scene.author ?? BOT} time={scene.time}>
      <PostHeading heading={scene.heading} />
      {scene.figure}
      {scene.reactions && <Reactions items={scene.reactions} />}
    </Message>
    {scene.chatter && <Chatter lines={scene.chatter} time={scene.time} />}
    {scene.system && (
      <SystemMessage
        kind={scene.system.kind}
        actor={scene.system.actor}
        text={scene.system.text}
        time={scene.time}
      />
    )}
    {scene.after}
  </ChannelSection>
);
