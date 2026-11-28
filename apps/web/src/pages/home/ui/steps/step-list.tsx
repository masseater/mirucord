import type { ReactNode } from "react";

import { SETUP_PROMPT } from "#/pages/home/ui/common/setup-prompt";
import { EmbedStack } from "#/pages/home/ui/message/embed-stack";
import type { EmbedItem } from "#/pages/home/ui/message/embed-stack";
import { DASHBOARD_PATH, ONBOARDING_STEPS } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";
import { PopButton } from "#/shared/ui/pop-button";

import { InviteChip } from "./invite-chip.tsx";
import { PromptBox } from "./prompt-box.tsx";

const CONSENT = "同意する";

const ITEMS: readonly EmbedItem[] = [
  {
    accent: "border-lavender-deep",
    title: `1. ${ONBOARDING_STEPS.consent.title}`,
    body: (
      <div className="flex flex-wrap gap-2">
        <InviteChip />
        <PopButton href={DASHBOARD_PATH} tone="secondary" size="sm">
          {CONSENT}
        </PopButton>
      </div>
    ),
  },
  {
    accent: "border-mint",
    title: `2. ${ONBOARDING_STEPS.register.title}`,
    body: <CopyBlock text={SETUP_PROMPT} />,
  },
  {
    accent: "border-pink-deep",
    title: `3. ${ONBOARDING_STEPS.ask.title}`,
    body: <PromptBox />,
  },
];

export const StepList = (): ReactNode => <EmbedStack tag="ol" items={ITEMS} />;
