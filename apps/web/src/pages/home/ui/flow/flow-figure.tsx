import type { ReactNode } from "react";

import { Figure } from "#/pages/home/ui/message/figure";

import { FlowDiagram } from "./flow-diagram";

const FlowFigure = (): ReactNode => (
  <Figure>
    <FlowDiagram />
  </Figure>
);

export { FlowFigure };
