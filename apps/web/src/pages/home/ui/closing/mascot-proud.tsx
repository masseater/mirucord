import type { ReactNode } from "react";

import { ProudBody } from "./proud-body";
import { ProudFace } from "./proud-face";

const SPARKLES = [
  "M18 34 L22 44 L32 48 L22 52 L18 62 L14 52 L4 48 L14 44 Z",
  "M142 12 L145 20 L153 23 L145 26 L142 34 L139 26 L131 23 L139 20 Z",
  "M150 84 L152 90 L158 92 L152 94 L150 100 L148 94 L142 92 L148 90 Z",
] as const;

const MascotProud = ({ className }: Readonly<{ className: string }>): ReactNode => (
  <svg viewBox="0 0 160 150" aria-hidden="true" className={className}>
    {SPARKLES.map((sparkle) => (
      <path key={sparkle} d={sparkle} className="fill-butter-deep" />
    ))}
    <ProudBody />
    <ProudFace />
  </svg>
);

export { MascotProud };
