import type { ReactNode } from "react";

import type { FlowEdge } from "#/pages/guide/model/guide-block";

const NODE = "bg-dc-input text-dc-bright rounded-2xl px-3 py-2 text-sm font-bold";
const ARROW = "→";

const FlowRow = ({ edge }: Readonly<{ edge: FlowEdge }>): ReactNode => (
  <li className="grid items-center gap-2 sm:grid-cols-3">
    <span className={NODE}>{edge.from}</span>
    <span className="text-lavender-deep flex items-center gap-2 text-xs font-bold sm:justify-center">
      <span aria-hidden="true">{ARROW}</span>
      {edge.label}
    </span>
    <span className={NODE}>{edge.to}</span>
  </li>
);

export { FlowRow };
