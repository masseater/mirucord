import type { ReactNode } from "react";

import type { ConsentStep, RegisterStep } from "#/pages/dashboard/model/next-steps";
import { McpUrlCopy } from "#/pages/dashboard/ui/mcp-url-copy";
import { ONBOARDING_STEPS } from "#/shared/config";

import { InviteGuide } from "./invite-guide";
import { NextStep } from "./next-step";
import { WaitingGuildLinks } from "./waiting-guild-links";

const NextStepList = ({
  consent,
  register,
  inviteUrl,
}: Readonly<{ consent: ConsentStep; register: RegisterStep; inviteUrl: string }>): ReactNode => (
  <ol className="flex flex-col gap-4">
    <NextStep order={1} title={ONBOARDING_STEPS.consent.title} state={consent.status}>
      {consent.status === "awaiting" && <WaitingGuildLinks guilds={consent.guilds} />}
      {consent.status === "invite" && <InviteGuide inviteUrl={inviteUrl} />}
    </NextStep>
    <NextStep order={2} title={ONBOARDING_STEPS.register.title} state={register.status}>
      <McpUrlCopy note={ONBOARDING_STEPS.register.guide} />
    </NextStep>
    <NextStep order={3} title={ONBOARDING_STEPS.ask.title} state="todo">
      <p className="text-dc-muted text-sm">{ONBOARDING_STEPS.ask.guide}</p>
    </NextStep>
  </ol>
);

export { NextStepList };
