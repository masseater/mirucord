import type { ReactNode } from "react";

const EARS = ["50", "110"] as const;
const FEET = ["62", "98"] as const;

const ProudBody = (): ReactNode => (
  <g>
    {FEET.map((foot) => (
      <ellipse key={foot} cx={foot} cy="134" rx="13" ry="7" className="fill-lavender-deep" />
    ))}
    <ellipse cx="80" cy="84" rx="50" ry="44" className="fill-lavender-deep" />
    {EARS.map((ear) => (
      <circle key={ear} cx={ear} cy="44" r="14" className="fill-lavender-deep" />
    ))}
    {EARS.map((ear) => (
      <circle key={`inner-${ear}`} cx={ear} cy="44" r="6" className="fill-pink" />
    ))}
    <ellipse cx="80" cy="94" rx="37" ry="28" className="fill-milk" />
    <ellipse
      cx="30"
      cy="100"
      rx="9"
      ry="15"
      transform="rotate(35 30 100)"
      className="fill-lavender-deep stroke-ink"
      strokeWidth="3"
    />
    <ellipse
      cx="130"
      cy="100"
      rx="9"
      ry="15"
      transform="rotate(-35 130 100)"
      className="fill-lavender-deep stroke-ink"
      strokeWidth="3"
    />
  </g>
);

export { ProudBody };
