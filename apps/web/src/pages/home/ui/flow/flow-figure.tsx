import type { ReactNode } from "react";

import { Figure } from "./figure";
import { FlowDiagram } from "./flow-diagram";

const FlowFigure = (): ReactNode => (
  <Figure>
    <FlowDiagram />
  </Figure>
);

export { FlowFigure };
