import type { ReactNode } from "react";

import { FinaleCard } from "./finale-card";

const SPARKS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SPARK = "✦";

const GatherCard = (): ReactNode => (
  <div className="scene-caption scene-finale grid justify-items-center">
    <span aria-hidden="true" className="finale-burst" />
    {SPARKS.map((spark) => (
      <span key={spark} aria-hidden="true" className="finale-spark">
        {SPARK}
      </span>
    ))}
    <FinaleCard />
  </div>
);

export { GatherCard };
