import type { ReactNode } from "react";

import { FlowDiagram } from "./flow-diagram";

const FlowFigure = (): ReactNode => (
  <div className="bg-milk text-ink mt-1 max-w-3xl overflow-x-auto rounded-lg p-4 md:p-8">
    <FlowDiagram />
  </div>
);

export { FlowFigure };
