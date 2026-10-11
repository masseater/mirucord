import type { ReactNode } from "react";

import { CopyBlock } from "#/pages/home/ui/common/copy-block";
import { DcLink } from "#/pages/home/ui/common/dc-link";
import { SETUP_PROMPT } from "#/pages/home/ui/common/setup-prompt";
import { DASHBOARD_PATH, MASCOT_NAME } from "#/shared/config";

import { InviteChip } from "./invite-chip";
import { PromptBox } from "./prompt-box";
import { StepItem } from "./step-item";

const INVITE = "1. Bot を招待して同意";
const REGISTER = `2. ${MASCOT_NAME}を登録`;
const ASK = "3. 話しかける";
const CONSENT = "管理画面で同意する";

const inviteActions = (): ReactNode => (
  <div className="flex flex-wrap gap-2">
    <InviteChip />
    <DcLink href={DASHBOARD_PATH} tone="secondary">
      {CONSENT}
    </DcLink>
  </div>
);

const StepList = (): ReactNode => (
  <ol className="grid gap-2">
    <StepItem accent="border-lavender-deep" title={INVITE}>
      {inviteActions()}
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
