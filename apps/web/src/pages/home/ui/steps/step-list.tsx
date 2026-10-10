import type { ReactNode } from "react";

import { CommandBox } from "./command-box";
import { InviteChip } from "./invite-chip";
import { PromptBox } from "./prompt-box";
import { StepItem } from "./step-item";

const INVITE = "1. Bot を招待";
const REGISTER = "2. AI に登録";
const ASK = "3. 話しかける";

const StepList = (): ReactNode => (
  <ol className="grid gap-2">
    <StepItem accent="border-lavender-deep" title={INVITE}>
      <InviteChip />
    </StepItem>
    <StepItem accent="border-mint-deep" title={REGISTER}>
      <CommandBox />
    </StepItem>
    <StepItem accent="border-pink-deep" title={ASK}>
      <PromptBox />
    </StepItem>
  </ol>
);

export { StepList };
