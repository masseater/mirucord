import type { ReactNode } from "react";

import { Captions } from "./captions";
import { CutIn } from "./cut-in";
import { Fragments } from "./fragments";
import { GatherCard } from "./gather-card";
import { SceneMiru } from "./scene-miru";

const FOUND = "みっけ";

const ScatterScene = (): ReactNode => (
  <div className="scene-track mt-4">
    <div className="scene-stage grid gap-6 px-4">
      <Fragments />
      <Captions />
      <SceneMiru />
      <p
        aria-hidden="true"
        className="scene-count bg-butter-deep text-ink font-maru rounded-full px-4 py-1 text-lg font-black"
      >
        {FOUND}
      </p>
    </div>
    <CutIn />
    <GatherCard />
  </div>
);

export { ScatterScene };
