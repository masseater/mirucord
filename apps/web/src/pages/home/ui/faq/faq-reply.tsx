import type { ReactNode } from "react";

import { BOT } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";
import { Reactions } from "#/pages/home/ui/message/reactions";

import { FaqAnswer } from "./faq-answer";
import type { Question } from "./question";

const FaqReply = ({ question }: Readonly<{ question: Question }>): ReactNode => (
  <Message author={BOT} time={question.time} reply={question.reply}>
    <FaqAnswer answer={question.answer}>
      <Reactions items={question.reactions} />
    </FaqAnswer>
  </Message>
);

export { FaqReply };
