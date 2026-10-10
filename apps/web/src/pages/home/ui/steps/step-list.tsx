import type { ReactNode } from "react";

import { CommandBox } from "./command-box";
import { InviteChip } from "./invite-chip";
import { PromptBox } from "./prompt-box";
import { Step } from "./step";

const INVITE = "Bot を招待";
const REGISTER = "AI に登録";
const ASK = "話しかける";

const StepList = (): ReactNode => (
  <ol className="border-sumi grid border-t-2 md:grid-cols-3">
    <Step number="01" title={INVITE}>
      <InviteChip />
    </Step>
    <Step number="02" title={REGISTER}>
      <CommandBox />
    </Step>
    <Step number="03" title={ASK}>
      <PromptBox />
    </Step>
  </ol>
);

export { StepList };
