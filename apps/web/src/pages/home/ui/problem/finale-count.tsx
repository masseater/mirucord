import type { ReactNode } from "react";

const LABEL = "キャンプの思い出";
const COUNT = "8";
const UNIT = "件";

const FinaleCount = (): ReactNode => (
  <p className="finale-count finale-part font-maru grid justify-items-start font-black">
    <span className="finale-label finale-part bg-milk text-ink">{LABEL}</span>
    <span className="finale-number finale-part text-butter-deep">
      {COUNT}
      <span className="finale-unit text-milk">{UNIT}</span>
    </span>
  </p>
);

export { FinaleCount };
