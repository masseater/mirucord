import type { ReactNode } from "react";

import { FlowDiagram } from "./flow-diagram";

const FlowFigure = (): ReactNode => (
  <div className="flow-figure bg-milk text-ink @container mt-1 max-w-3xl rounded-lg p-4 md:p-8">
    <FlowDiagram layout="row" />
    <FlowDiagram layout="column" />
  </div>
);

export { FlowFigure };
