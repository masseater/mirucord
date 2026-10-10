import type { ReactNode } from "react";

const LINES = ["ミルが", "ぜんぶ", "見つけてきたよ！"] as const;

const FinaleTitle = (): ReactNode => (
  <p className="finale-title finale-part font-maru grid justify-items-start font-black">
    {LINES.map((line) => (
      <span key={line} className="finale-word finale-part">
        {line}
      </span>
    ))}
  </p>
);

export { FinaleTitle };
