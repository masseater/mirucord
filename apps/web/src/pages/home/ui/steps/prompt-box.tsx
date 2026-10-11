import type { ReactNode } from "react";

import { SAMPLE_PROMPT } from "#/shared/config";

const ENTER = "↵";

const PromptBox = (): ReactNode => (
  <div className="bg-dc-input text-dc-text flex items-center justify-between gap-2.5 rounded-lg px-4 py-2.5 text-sm">
    <span>{SAMPLE_PROMPT}</span>
    <span className="bg-grape text-dc-bright grid size-7 place-items-center rounded-full">
      {ENTER}
    </span>
  </div>
);

export { PromptBox };
