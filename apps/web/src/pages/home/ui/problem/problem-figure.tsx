import type { ReactNode } from "react";

import { Figure } from "#/pages/home/ui/message/figure";

import { ProblemDiagram } from "./problem-diagram";

const ProblemFigure = (): ReactNode => (
  <Figure>
    <ProblemDiagram />
  </Figure>
);

export { ProblemFigure };
