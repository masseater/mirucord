import type { ReactNode } from "react";

import { Message } from "#/pages/home/ui/message/message";

import { FaqReply } from "./faq-reply";
import type { Question } from "./question";

const FaqPair = ({ question }: Readonly<{ question: Question }>): ReactNode => (
  <>
    <Message author={question.reply.author} time={question.time}>
      <h3>{question.reply.text}</h3>
    </Message>
    <FaqReply question={question} />
  </>
);

export { FaqPair };
