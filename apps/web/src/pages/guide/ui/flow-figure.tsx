import type { ReactNode } from "react";

import { FlowRow } from "./flow-row";
import type { FlowEdge } from "./guide-block";

const FlowFigure = ({ edges }: Readonly<{ edges: readonly FlowEdge[] }>): ReactNode => (
  <ul className="grid gap-3">
    {edges.map((edge) => (
      <FlowRow key={`${edge.from}>${edge.to}`} edge={edge} />
    ))}
  </ul>
);

export { FlowFigure };
