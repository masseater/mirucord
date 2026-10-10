import type { ReactNode } from "react";

const DECISION = "3/21 への延期";
const SOURCE = "#開発 21:11";

const AnswerSource = (): ReactNode => (
  <ruby>
    {DECISION}
    <rt className="text-shu-soft font-mono text-xs">{SOURCE}</rt>
  </ruby>
);

export { AnswerSource };
