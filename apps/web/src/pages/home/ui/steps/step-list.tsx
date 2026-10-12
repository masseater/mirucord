import type { ReactNode } from "react";

import { DcLink } from "#/pages/home/ui/common/dc-link";
import { SETUP_PROMPT } from "#/pages/home/ui/common/setup-prompt";
import { DASHBOARD_PATH, ONBOARDING_STEPS } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";

import { InviteChip } from "./invite-chip";
import { PromptBox } from "./prompt-box";
import { StepItem } from "./step-item";

const INVITE = `1. ${ONBOARDING_STEPS.consent.title}`;
const REGISTER = `2. ${ONBOARDING_STEPS.register.title}`;
const ASK = `3. ${ONBOARDING_STEPS.ask.title}`;
const CONSENT = "同意する";

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
