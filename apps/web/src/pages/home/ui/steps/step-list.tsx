import type { ReactNode } from "react";

import { CopyBlock } from "#/pages/home/ui/common/copy-block";
import { SETUP_PROMPT } from "#/pages/home/ui/common/setup-prompt";

import { InviteActions } from "./invite-actions";
import { PromptBox } from "./prompt-box";
import { StepItem } from "./step-item";

const INVITE = "1. Bot を招待して同意";
const REGISTER = "2. ミルを登録";
const ASK = "3. 話しかける";

const StepList = (): ReactNode => (
  <ol className="grid gap-2">
    <StepItem accent="border-lavender-deep" title={INVITE}>
      <InviteActions />
    </StepItem>
    <StepItem accent="border-mint" title={REGISTER}>
      <CopyBlock text={SETUP_PROMPT} />
    </StepItem>
    <StepItem accent="border-pink-deep" title={ASK}>
      <PromptBox />
    </StepItem>
  </ol>
);

export { StepList };
