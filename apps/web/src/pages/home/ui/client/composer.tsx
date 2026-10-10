import type { ReactNode } from "react";

const PLACEHOLDER = "#ざつだん へメッセージを送信";
const PLUS = "+";
const TYPER = "ゆい";
const TYPING = "が入力中…";
const DOTS = ["a", "b", "c"] as const;

const Composer = (): ReactNode => (
  <div aria-hidden="true" className="bg-dc-chat sticky bottom-0 px-4 pt-1">
    <div className="bg-dc-input text-dc-muted flex h-11 items-center gap-4 rounded-lg px-4">
      <span className="bg-dc-muted text-dc-input grid size-6 shrink-0 place-items-center rounded-full font-bold">
        {PLUS}
      </span>
      <span className="truncate">{PLACEHOLDER}</span>
    </div>
    <p className="composer-typing text-dc-muted flex h-6 items-center gap-0.5 text-xs">
      {DOTS.map((dot) => (
        <span key={dot} className="bg-dc-text size-1.5 rounded-full motion-safe:animate-pulse" />
      ))}
      <span className="text-dc-text mr-1 ml-1.5 font-bold">{TYPER}</span>
      {TYPING}
    </p>
  </div>
);

export { Composer };
