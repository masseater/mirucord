import type { ReactNode } from "react";

export const FlowCard = ({
  left,
  top,
  height,
  fill,
  shadow,
  radius,
  children,
}: Readonly<{
  left: string;
  top: string;
  height: number;
  fill: string;
  shadow: boolean;
  radius: number;
  children: ReactNode;
}>): ReactNode => (
  <g transform={`translate(${left} ${top})`}>
    {shadow && <rect y="8" width="230" height={height} rx={radius} className="fill-ink" />}
    <rect
      width="230"
      height={height}
      rx={radius}
      className={`${fill} stroke-ink`}
      strokeWidth="3"
    />
    {children}
  </g>
);
