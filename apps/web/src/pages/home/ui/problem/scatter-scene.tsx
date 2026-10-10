import type { ReactNode } from "react";

import { Captions } from "./captions";
import { CutIn } from "./cut-in";
import { Fragments } from "./fragments";
import { SceneMiru } from "./scene-miru";

const ScatterScene = (): ReactNode => (
  <div className="scene-track mt-4">
    <div className="scene-stage grid gap-6 px-4">
      <Fragments />
      <Captions />
      <SceneMiru />
    </div>
    <CutIn />
  </div>
);

export { ScatterScene };
