import { Array, pipe } from "effect";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import type { FlowEdge } from "#/pages/guide/model/guide-block";

const NODE = "bg-dc-input text-dc-bright rounded-2xl px-3 py-2 text-sm font-bold";

const flowRow = (edge: FlowEdge): ReactNode => (
  <li key={`${edge.from}>${edge.to}`} className="grid items-center gap-2 sm:grid-cols-3">
    <span className={NODE}>{edge.from}</span>
    <span className="text-lavender-deep flex items-center gap-2 text-xs font-bold sm:justify-center">
      <ArrowRight aria-hidden className="size-4" />
      {edge.label}
    </span>
    <span className={NODE}>{edge.to}</span>
  </li>
);

const GuideFlow = ({ edges }: Readonly<{ edges: readonly FlowEdge[] }>): ReactNode => (
  <ul className="grid gap-3">
    {pipe(
      edges,
      Array.map((edge) => flowRow(edge)),
    )}
  </ul>
);

export { GuideFlow };
