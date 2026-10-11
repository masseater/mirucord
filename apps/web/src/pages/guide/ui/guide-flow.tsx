import type { ReactNode } from "react";

import type { FlowEdge } from "#/pages/guide/model/guide-block";

import { GuideFlowRow } from "./guide-flow-row";

const GuideFlow = ({ edges }: Readonly<{ edges: readonly FlowEdge[] }>): ReactNode => (
  <ul className="grid gap-3">
    {edges.map((edge) => (
      <GuideFlowRow key={`${edge.from}>${edge.to}`} edge={edge} />
    ))}
  </ul>
);

export { GuideFlow };
