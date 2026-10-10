import type { ReactNode } from "react";

import { AnswerLinks } from "./answer-links";

const QUESTION = "去年のキャンプでカレー焦がしたの誰だっけ？";
const ANSWER_LEAD = "たなかさんです。その夜に「";
const DECISION = "次こそカレー焦がさない";
const ANSWER_TAIL = "」と誓っていました。";

const AnswerBody = (): ReactNode => (
  <div className="grid gap-3 px-4 py-4">
    <p className="bg-lavender ml-auto w-fit rounded-2xl rounded-br-sm px-3 py-1.5 text-sm font-bold">
      {QUESTION}
    </p>
    <p className="text-sm leading-relaxed font-bold">
      {ANSWER_LEAD}
      <span className="marker-butter">{DECISION}</span>
      {ANSWER_TAIL}
    </p>
    <AnswerLinks />
  </div>
);

export { AnswerBody };
