import type { ReactNode } from "react";

import { Captions } from "./captions";
import { Fragments } from "./fragments";

const ScatterScene = (): ReactNode => (
  <div className="scene-track mt-4">
    <div className="scene-stage grid gap-6 px-4">
      <Fragments />
      <Captions />
    </div>
  </div>
);

export { ScatterScene };
