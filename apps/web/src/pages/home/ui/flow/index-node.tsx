import type { ReactNode } from "react";

const GLYPH = "索";
const NAME = "mirucord";
const CAPTION = "暗号化して索引に";

const IndexNode = (): ReactNode => (
  <g transform="translate(385 40)">
    <rect width="230" height="220" rx="22" className="fill-shu" />
    <text
      x="115"
      y="110"
      textAnchor="middle"
      className="fill-paper font-mincho text-7xl font-black"
    >
      {GLYPH}
    </text>
    <text x="115" y="154" textAnchor="middle" className="fill-paper text-base font-bold">
      {NAME}
    </text>
    <text x="115" y="178" textAnchor="middle" className="fill-shu-soft text-sm">
      {CAPTION}
    </text>
  </g>
);

export { IndexNode };
