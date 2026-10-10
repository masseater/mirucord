import type { ReactNode } from "react";

const PROMPT = "先月の議論をまとめて";
const ENTER = "↵";

const PromptBox = (): ReactNode => (
  <div className="bg-pink flex items-center justify-between gap-2.5 rounded-full px-5 py-3 text-sm font-bold">
    <span>{PROMPT}</span>
    <span className="bg-ink text-milk grid size-7 place-items-center rounded-full">{ENTER}</span>
  </div>
);

export { PromptBox };
