import type { ReactNode } from "react";

const DECISION = "3/21 への延期";
const SOURCE = "#開発 21:11";

const AnswerSource = (): ReactNode => (
  <ruby className="marker-butter">
    {DECISION}
    <rt className="text-ink-soft text-xs">{SOURCE}</rt>
  </ruby>
);

export { AnswerSource };
