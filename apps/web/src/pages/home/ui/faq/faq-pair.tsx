import type { ReactNode } from "react";

import { BOT } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";
import type { Reply } from "#/pages/home/ui/message/message";
import { Reactions } from "#/pages/home/ui/message/reactions";
import type { Reaction } from "#/pages/home/ui/message/reactions";

const FaqPair = ({
  time,
  answer,
  reply,
  reactions,
}: Readonly<{
  time: string;
  answer: string;
  reply: Reply;
  reactions: readonly Reaction[];
}>): ReactNode => (
  <>
    <Message author={reply.author} time={time}>
      <h3>{reply.text}</h3>
    </Message>
    <Message author={BOT} time={time} reply={reply}>
      <p>{answer}</p>
      <Reactions items={reactions} />
    </Message>
  </>
);

export { FaqPair };
