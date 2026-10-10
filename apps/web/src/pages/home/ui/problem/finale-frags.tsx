import type { ReactNode } from "react";

import { FragmentCard } from "./fragment-card";
import { FRAGMENTS } from "./fragments";

const FinaleFrags = (): ReactNode => (
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
);

export { FinaleFrags };
