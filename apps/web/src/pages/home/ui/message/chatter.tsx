import type { ReactNode } from "react";

import type { Author } from "./author";
import { Message } from "./message";
import type { Reply } from "./message";
import { Reactions } from "./reactions";
import type { Reaction } from "./reactions";

type ChatLine = Readonly<{
  author: Author;
  time: string;
  text: string;
  reply?: Reply;
  reactions: readonly Reaction[];
}>;

const Chatter = ({ lines }: Readonly<{ lines: readonly ChatLine[] }>): ReactNode => (
  <div>
    {lines.map((line) => (
      <Message key={line.text} author={line.author} time={line.time} reply={line.reply}>
        <p>{line.text}</p>
        <Reactions items={line.reactions} />
      </Message>
    ))}
  </div>
);

export { Chatter };
export type { ChatLine };
