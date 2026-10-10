import type { ReactNode } from "react";

import cutinMiru from "./cutin-miru.svg";
import { FinaleCount } from "./finale-count";
import { FinaleTitle } from "./finale-title";
import { FragmentCard } from "./fragment-card";
import { FRAGMENTS } from "./fragments";

const SPARKS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const SPARK = "✦";

const GatherCard = (): ReactNode => (
  <div className="scene-finale">
    <span aria-hidden="true" className="finale-lines finale-part" />
    <span aria-hidden="true" className="finale-burst finale-part" />
    <span aria-hidden="true" className="finale-slab finale-part bg-grape" />
    <span aria-hidden="true" className="finale-stripe finale-part bg-butter-deep" />
    <span aria-hidden="true" className="finale-ring finale-part" />
    <ul aria-hidden="true" className="finale-frags">
      {FRAGMENTS.map((fragment) => (
        <FragmentCard
          key={fragment.text}
          className="finale-frag finale-part"
          member={fragment.member}
          text={fragment.text}
        />
      ))}
    </ul>
    <img
      src={cutinMiru}
      alt=""
      width="2048"
      height="2048"
      loading="lazy"
      className="finale-miru finale-part"
    />
    {SPARKS.map((spark) => (
      <span key={spark} aria-hidden="true" className="finale-spark finale-part">
        {SPARK}
      </span>
    ))}
    <FinaleTitle />
    <FinaleCount />
  </div>
);

export { GatherCard };
