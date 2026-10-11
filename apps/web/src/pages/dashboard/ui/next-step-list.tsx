import type { ReactNode } from "react";

import type { ConsentStep, RegisterStep } from "#/pages/dashboard/model/next-steps";
import { ONBOARDING_STEPS, SAMPLE_PROMPT } from "#/shared/config";

import { InviteGuide } from "./invite-guide";
import { NextStep } from "./next-step";
import { RegisterGuide } from "./register-guide";
import { WaitingGuildLinks } from "./waiting-guild-links";

const ASK_NOTE = `登録したアプリで「${SAMPLE_PROMPT}」のように話しかけてね。`;

const NextStepList = ({
  consent,
  register,
  inviteUrl,
}: Readonly<{ consent: ConsentStep; register: RegisterStep; inviteUrl: string }>): ReactNode => (
  <ol className="flex flex-col gap-4">
    <NextStep order={1} title={ONBOARDING_STEPS.consent} state={consent.status}>
      {consent.status === "awaiting" && <WaitingGuildLinks guilds={consent.guilds} />}
      {consent.status === "invite" && <InviteGuide inviteUrl={inviteUrl} />}
    </NextStep>
    <NextStep order={2} title={ONBOARDING_STEPS.register} state={register.status}>
      <RegisterGuide />
    </NextStep>
    <NextStep order={3} title={ONBOARDING_STEPS.ask} state="todo">
      <p className="text-dc-muted text-sm">{ASK_NOTE}</p>
    </NextStep>
  </ol>
);

export { NextStepList };
