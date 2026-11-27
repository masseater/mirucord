import type { ReactNode } from "react";

export const FlowLabel = ({
  y,
  tone,
  children,
}: Readonly<{ y: number; tone: string; children: ReactNode }>): ReactNode => (
  <text x="115" y={y} textAnchor="middle" className={tone}>
    {children}
  </text>
);
