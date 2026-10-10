import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const SEARCHING = "ミルがさがしてるよ";
const DONE = "ミルが見つけてきたよ";
const DONE_MARK = "✓";
const DOTS = ["a", "b", "c"] as const;

const AnswerStatus = (): ReactNode => (
  <p className="answer-status text-ink-soft grid text-xs font-bold">
    <span aria-hidden="true" className="answer-searching flex items-center gap-1.5">
      <Mascot className="motion-safe:animate-wiggle size-6" />
      {SEARCHING}
      {DOTS.map((dot) => (
        <span key={dot} className="bg-ink-soft size-1 rounded-full motion-safe:animate-pulse" />
      ))}
    </span>
    <span className="answer-done flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="bg-mint text-ink grid size-6 place-items-center rounded-full"
      >
        {DONE_MARK}
      </span>
      {DONE}
    </span>
  </p>
);

export { AnswerStatus };
