import type { ReactNode } from "react";

import { AnswerSource } from "./answer-source";

const QUESTION = "> リリースが延びたのはなぜ？";
const ANSWER_LEAD = "決済まわりの不具合が残っていたためです。3月12日の会話で";
const ANSWER_TAIL = "が決まりました。";
const CITATION = "#開発 の 4 件を参照";

const AnswerCard = (): ReactNode => (
  <div className="bg-sumi text-paper shadow-sumi motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-both motion-safe:slide-in-from-bottom-4 absolute -right-2 -bottom-20 w-11/12 max-w-sm -rotate-1 rounded-2xl px-6 py-5 motion-safe:delay-1000 motion-safe:duration-1000 md:-right-8">
    <p className="text-kinu mb-2.5 font-mono text-xs">{QUESTION}</p>
    <p className="text-sm leading-9">
      {ANSWER_LEAD}
      <AnswerSource />
      {ANSWER_TAIL}
    </p>
    <span className="border-sumi-soft text-kinu mt-3 inline-flex rounded-full border px-3 py-1 font-mono text-xs">
      {CITATION}
    </span>
  </div>
);

export { AnswerCard };
