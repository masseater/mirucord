import type { ReactNode } from "react";

import { AnswerSource } from "./answer-source";

const QUESTION = "去年のキャンプでカレー焦がしたの誰だっけ？";
const ANSWER_LEAD = "たなかさんです。その夜に";
const ANSWER_TAIL = "と誓っていました。";
const CITATION = "思い出を 4 件みつけたよ";

const AnswerCard = (): ReactNode => (
  <div className="border-ink bg-lavender shadow-pop motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:slide-in-from-bottom-4 relative mt-6 ml-auto w-11/12 max-w-sm rotate-1 rounded-3xl border-2 px-6 py-5 motion-safe:delay-700 motion-safe:duration-700">
    <p className="bg-milk mb-3 w-fit rounded-full px-3 py-1 text-xs font-bold">{QUESTION}</p>
    <p className="text-sm leading-9 font-bold">
      {ANSWER_LEAD}
      <AnswerSource />
      {ANSWER_TAIL}
    </p>
    <span className="bg-sky mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold">
      {CITATION}
    </span>
  </div>
);

export { AnswerCard };
