import type { ReactNode } from "react";

const PLACEHOLDER = "#ざつだん へメッセージを送信";
const PLUS = "+";

const Composer = (): ReactNode => (
  <div aria-hidden="true" className="bg-dc-chat sticky bottom-0 px-4 pt-1 pb-6">
    <div className="bg-dc-input text-dc-muted flex h-11 items-center gap-4 rounded-lg px-4">
      <span className="bg-dc-muted text-dc-input grid size-6 shrink-0 place-items-center rounded-full font-bold">
        {PLUS}
      </span>
      <span className="truncate">{PLACEHOLDER}</span>
    </div>
  </div>
);

export { Composer };
