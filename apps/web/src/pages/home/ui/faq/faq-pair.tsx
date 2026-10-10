import type { ReactNode } from "react";

import type { Member } from "#/pages/home/ui/common/members";
import { BOT, memberAuthor } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";

const FaqPair = ({
  member,
  time,
  question,
  answer,
}: Readonly<{ member: Member; time: string; question: string; answer: string }>): ReactNode => (
  <>
    <Message author={memberAuthor(member)} time={time}>
      <h3>{question}</h3>
    </Message>
    <Message author={BOT} time={time}>
      <p>{answer}</p>
    </Message>
  </>
);

export { FaqPair };
