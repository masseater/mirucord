import type { ReactNode } from "react";
import { siClaude } from "simple-icons";

const ClaudeMark = ({
  left,
  top,
  size,
}: Readonly<{ left: string; top: string; size: string }>): ReactNode => (
  <svg
    x={left}
    y={top}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="fill-claude"
  >
    <path d={siClaude.path} />
  </svg>
);

export { ClaudeMark };
