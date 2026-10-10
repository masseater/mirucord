import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const SceneMiru = (): ReactNode => (
  <span aria-hidden="true" className="scene-miru">
    <Mascot className="size-full" />
  </span>
);

export { SceneMiru };
