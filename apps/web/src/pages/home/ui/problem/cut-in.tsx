import type { ReactNode } from "react";

import cutinMiru from "./cutin-miru.svg";

const LEAD = "ミルが";
const TITLE = ["ぜんぶ集めて", "くるよ！"] as const;

const CutIn = (): ReactNode => (
  <div className="cutin">
    <span aria-hidden="true" className="cutin-flash bg-milk" />
    <span aria-hidden="true" className="cutin-lines" />
    <span aria-hidden="true" className="cutin-band cutin-band-sub bg-butter-deep" />
    <span aria-hidden="true" className="cutin-band bg-grape" />
    <img src={cutinMiru} alt="" width="2048" height="2048" loading="lazy" className="cutin-miru" />
    <p className="cutin-title text-milk font-maru font-black">
      <span className="cutin-lead">{LEAD}</span>
      {TITLE.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </p>
  </div>
);

export { CutIn };
