import type { ReactNode } from "react";

import { BOT } from "./author";
import { Message } from "./message";
import { MessageHeading } from "./message-heading";

const Post = ({
  time,
  guide,
  lead,
  tail,
  children,
}: Readonly<{
  time: string;
  guide: string;
  lead: string;
  tail?: string;
  children?: ReactNode;
}>): ReactNode => (
  <Message author={BOT} time={time}>
    <p>{guide}</p>
    <MessageHeading lead={lead} tail={tail} />
    {children}
  </Message>
);

export { Post };
