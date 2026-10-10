import type { ReactNode } from "react";

import { CommandBox } from "./command-box";
import { InviteChip } from "./invite-chip";
import { PromptBox } from "./prompt-box";
import { Step } from "./step";

const INVITE = "Bot を招待";
const REGISTER = "ミルを登録";
const ASK = "話しかける";

const StepList = (): ReactNode => (
  <ol className="grid gap-6 md:grid-cols-3">
    <Step number="1" tone="bg-lavender-deep" title={INVITE}>
      <InviteChip />
    </Step>
    <Step number="2" tone="bg-butter-deep" title={REGISTER}>
      <CommandBox />
    </Step>
    <Step number="3" tone="bg-pink-deep" title={ASK}>
      <PromptBox />
    </Step>
  </ol>
);

export { StepList };
