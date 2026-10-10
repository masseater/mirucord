import type { ReactNode } from "react";

const EYES = ["46", "74"] as const;

const Mascot = ({
  className,
  left,
  top,
  size,
}: Readonly<{ className: string; left?: string; top?: string; size?: string }>): ReactNode => (
  <svg
    x={left}
    y={top}
    width={size}
    height={size}
    viewBox="0 0 128 120"
    aria-hidden="true"
    className={className}
  >
    <circle cx="30" cy="30" r="14" className="fill-lavender-deep" />
    <circle cx="90" cy="30" r="14" className="fill-lavender-deep" />
    <circle cx="30" cy="30" r="6" className="fill-pink" />
    <circle cx="90" cy="30" r="6" className="fill-pink" />
    <ellipse cx="60" cy="68" rx="50" ry="44" className="fill-lavender-deep" />
    <ellipse cx="60" cy="76" rx="37" ry="28" className="fill-milk" />
    {EYES.map((eye) => (
      <ellipse
        key={eye}
        cx={eye}
        cy="71"
        rx="5.5"
        ry="7.5"
        className="fill-ink origin-fill motion-safe:animate-blink"
      />
    ))}
    <circle cx="48" cy="68" r="2" className="fill-milk" />
    <circle cx="76" cy="68" r="2" className="fill-milk" />
    <ellipse cx="34" cy="84" rx="6.5" ry="4" className="fill-pink-deep opacity-60" />
    <ellipse cx="86" cy="84" rx="6.5" ry="4" className="fill-pink-deep opacity-60" />
    <path
      d="M54 86 Q60 92 66 86"
      className="stroke-ink"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <path d="M110 104 L120 114" className="stroke-ink" strokeWidth="7" strokeLinecap="round" />
    <circle cx="102" cy="96" r="13" className="fill-sky stroke-ink" strokeWidth="4" />
    <circle cx="97" cy="91" r="3" className="fill-milk" />
  </svg>
);

export { Mascot };
