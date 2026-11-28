import type { ReactNode } from "react";

import { BOT } from "#/pages/home/ui/message/author";
import { Message } from "#/pages/home/ui/message/message";

import { FaqAnswer } from "./faq-answer.tsx";
import type { Question } from "./question.ts";

export const FaqPair = ({ question }: Readonly<{ question: Question }>): ReactNode => (
  <>
    <Message author={question.reply.author} time={question.time}>
      <h3>{question.reply.text}</h3>
    </Message>
    <Message author={BOT} time={question.time} reply={question.reply}>
      <FaqAnswer answer={question.answer} copy={question.copy} reactions={question.reactions} />
    </Message>
  </>
);
