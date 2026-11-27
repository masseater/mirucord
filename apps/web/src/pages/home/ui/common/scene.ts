import type { ReactNode } from "react";

import type { Author } from "#/pages/home/ui/message/author";
import type { ChatLine } from "#/pages/home/ui/message/chat-line";
import type { Heading } from "#/pages/home/ui/message/post-heading";
import type { Reaction } from "#/pages/home/ui/message/reactions";

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
