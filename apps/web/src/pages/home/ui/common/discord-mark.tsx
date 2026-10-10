import type { ReactNode } from "react";
import { siDiscord } from "simple-icons";

const DiscordMark = ({
  className,
  left,
  top,
  size,
}: Readonly<{ className: string; left?: string; top?: string; size: string }>): ReactNode => (
  <svg
    x={left}
    y={top}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
  >
    <path d={siDiscord.path} />
  </svg>
);

export { DiscordMark };
