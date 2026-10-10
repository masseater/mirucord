import type { ReactNode } from "react";

import { InviteChip } from "./invite-chip";
import { PromptBox } from "./prompt-box";
import { RegisterPrompt } from "./register-prompt";
import { StepItem } from "./step-item";

const INVITE = "1. Bot を招待";
const REGISTER = "2. ミルを登録";
const ASK = "3. 話しかける";

const StepList = (): ReactNode => (
  <ol className="grid gap-2">
    <StepItem accent="border-lavender-deep" title={INVITE}>
      <InviteChip />
    </StepItem>
    <StepItem accent="border-mint" title={REGISTER}>
      <RegisterPrompt />
    </StepItem>
    <StepItem accent="border-pink-deep" title={ASK}>
      <PromptBox />
    </StepItem>
  </ol>
);

export { StepList };
