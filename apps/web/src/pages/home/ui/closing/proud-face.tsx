import type { ReactNode } from "react";

const EYES = ["M58 86 Q65 77 72 86", "M88 86 Q95 77 102 86"] as const;
const CHEEKS = ["54", "106"] as const;

const ProudFace = (): ReactNode => (
  <g>
    {EYES.map((eye) => (
      <path
        key={eye}
        d={eye}
        className="stroke-ink"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
      />
    ))}
    {CHEEKS.map((cheek) => (
      <ellipse
        key={cheek}
        cx={cheek}
        cy="100"
        rx="6.5"
        ry="4"
        className="fill-pink-deep opacity-60"
      />
    ))}
    <path
      d="M70 100 Q80 112 90 100 Z"
      className="fill-pink-deep stroke-ink"
      strokeWidth="3"
      strokeLinejoin="round"
    />
  </g>
);

export { ProudFace };
