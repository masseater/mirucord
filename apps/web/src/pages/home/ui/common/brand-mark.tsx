import type { ReactNode } from "react";

export const BrandMark = ({
  path,
  className,
  size,
  left,
  top,
}: Readonly<{
  path: string;
  className: string;
  size: string;
  left?: string;
  top?: string;
}>): ReactNode => (
  <svg
    x={left}
    y={top}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
  >
    <path d={path} />
  </svg>
);
