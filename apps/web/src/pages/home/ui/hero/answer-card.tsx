import type { ReactNode } from "react";

import { AnswerSource } from "./answer-source";

const QUESTION = "リリースが延びたのはなぜ？";
const ANSWER_LEAD = "決済まわりの不具合が残っていたためです。3月12日の会話で";
const ANSWER_TAIL = "が決まりました。";
const CITATION = "#開発 の 4 件を参照";

const AnswerCard = (): ReactNode => (
  <div className="border-ink bg-lavender shadow-pop motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:slide-in-from-bottom-4 relative mt-6 ml-auto w-11/12 max-w-sm rotate-1 rounded-3xl border-2 px-6 py-5 motion-safe:delay-700 motion-safe:duration-700">
    <p className="bg-milk mb-3 w-fit rounded-full px-3 py-1 text-xs font-bold">{QUESTION}</p>
    <p className="text-sm leading-9 font-bold">
      {ANSWER_LEAD}
      <AnswerSource />
      {ANSWER_TAIL}
    </p>
    <span className="bg-mint mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold">
      {CITATION}
    </span>
  </div>
);

export { AnswerCard };
