import type { ReactNode } from "react";

const CrossMark = (): ReactNode => (
  <g transform="translate(470 290)">
    <circle r="16" className="fill-washi stroke-shu" strokeWidth="1.5" />
    <path d="M-6 -6 L6 6 M6 -6 L-6 6" className="stroke-shu" strokeWidth="2" />
  </g>
);

export { CrossMark };
