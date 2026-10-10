import type { ReactNode } from "react";

import { BOT } from "./author";
import type { Author } from "./author";
import { Message } from "./message";

const Post = ({
  author = BOT,
  time,
  guide,
  lead,
  tail,
  children,
}: Readonly<{
  author?: Author;
  time: string;
  guide?: string;
  lead: string;
  tail?: string;
  children?: ReactNode;
}>): ReactNode => (
  <Message author={author} time={time}>
    {typeof guide === "string" && <p>{guide}</p>}
    <h2 className="text-dc-bright font-maru my-1 text-2xl leading-snug font-black md:text-3xl">
      <span className="block">{lead}</span>
      <span className="block">{tail}</span>
    </h2>
    {children}
  </Message>
);

export { Post };
