import type { ReactNode } from "react";

import type { FlowEdge } from "#/pages/guide/model/guide-block";

import { FlowRow } from "./flow-row";

const FlowFigure = ({ edges }: Readonly<{ edges: readonly FlowEdge[] }>): ReactNode => (
  <ul className="grid gap-3">
    {edges.map((edge) => (
      <FlowRow key={`${edge.from}>${edge.to}`} edge={edge} />
    ))}
  </ul>
);

export { FlowFigure };
