import type { ReactNode } from "react";
import { siClaude } from "simple-icons";

const ClaudeMark = (): ReactNode => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="fill-claude">
    <path d={siClaude.path} />
  </svg>
);

export { ClaudeMark };
