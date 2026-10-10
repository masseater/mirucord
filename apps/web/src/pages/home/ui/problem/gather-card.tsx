import type { ReactNode } from "react";

import cutinMiru from "./cutin-miru.svg";
import { FinaleCount } from "./finale-count";
import { FinaleTitle } from "./finale-title";

const SPARKS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SPARK = "✦";

const GatherCard = (): ReactNode => (
  <div className="scene-caption scene-finale">
    <span aria-hidden="true" className="finale-burst" />
    <span aria-hidden="true" className="finale-slab bg-grape" />
    <span aria-hidden="true" className="finale-stripe bg-butter-deep" />
    <img src={cutinMiru} alt="" width="2048" height="2048" loading="lazy" className="finale-miru" />
    {SPARKS.map((spark) => (
      <span key={spark} aria-hidden="true" className="finale-spark">
        {SPARK}
      </span>
    ))}
    <FinaleTitle />
    <FinaleCount />
  </div>
);

export { GatherCard };
