import type { ReactNode } from "react";

import { mascotSrc } from "#/shared/brand";

const NAME = "mirucord";
const CAPTION = "鍵をかけてしまっておく";

const MiruNode = ({ left, top }: Readonly<{ left: string; top: string }>): ReactNode => (
  <g transform={`translate(${left} ${top})`}>
    <rect width="230" height="240" rx="48" className="fill-pink stroke-ink" strokeWidth="3" />
    <image
      href={mascotSrc}
      x="55"
      y="20"
      width="120"
      height="120"
      aria-hidden="true"
      className="motion-safe:animate-wiggle origin-fill"
    />
    <text x="115" y="184" textAnchor="middle" className="fill-ink text-xl font-black">
      {NAME}
    </text>
    <text x="115" y="212" textAnchor="middle" className="fill-ink-soft text-sm font-bold">
      {CAPTION}
    </text>
  </g>
);

export { MiruNode };
