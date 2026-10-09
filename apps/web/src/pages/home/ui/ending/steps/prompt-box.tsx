import type { ReactNode } from "react";

const PROMPT = "先月の議論をまとめて";
const ENTER = "↵";

const PromptBox = (): ReactNode => (
  <div className="border-kinu bg-paper flex justify-between gap-2.5 rounded-xl border px-4 py-3.5 text-sm">
    <span>{PROMPT}</span>
    <span className="text-shu font-mono">{ENTER}</span>
  </div>
);

export { PromptBox };
