import type { ReactNode } from "react";

import type { ConsentStep, RegisterStep } from "#/pages/dashboard/model/next-steps";
import { GuildItems } from "#/pages/dashboard/ui/guild-items";
import { MCP_URL, ONBOARDING_STEPS, SAMPLE_PROMPT } from "#/shared/config";
import { CopyBlock } from "#/shared/ui/copy-block";

import { InviteGuide } from "./invite-guide.tsx";
import { NextStep } from "./next-step.tsx";
import { WaitingGuildLink } from "./waiting-guild-link.tsx";

export const NextStepList = ({
  consent,
  register,
  inviteUrl,
}: Readonly<{ consent: ConsentStep; register: RegisterStep; inviteUrl: string }>): ReactNode => (
  <ol className="flex flex-col gap-4">
    <NextStep order={1} title={ONBOARDING_STEPS.consent.title} state={consent.status}>
      {consent.status === "awaiting" && (
        <GuildItems
          guilds={consent.guilds}
          className="flex flex-wrap gap-2"
          item={WaitingGuildLink}
        />
      )}
      {consent.status === "invite" && <InviteGuide inviteUrl={inviteUrl} />}
    </NextStep>
    <NextStep order={2} title={ONBOARDING_STEPS.register.title} state={register.status}>
      <CopyBlock text={MCP_URL} />
    </NextStep>
    <NextStep order={3} title={ONBOARDING_STEPS.ask.title} state="todo">
      <CopyBlock text={SAMPLE_PROMPT} />
    </NextStep>
  </ol>
);
