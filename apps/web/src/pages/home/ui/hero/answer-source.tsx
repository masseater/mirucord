import type { ReactNode } from "react";

const DECISION = "次こそカレー焦がさない";
const SOURCE = "#ざつだん 22:14";

const AnswerSource = (): ReactNode => (
  <ruby className="marker-butter">
    {DECISION}
    <rt className="text-ink-soft text-xs">{SOURCE}</rt>
  </ruby>
);

export { AnswerSource };
