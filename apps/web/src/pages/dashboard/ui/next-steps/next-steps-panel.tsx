import type { ReactNode } from "react";

import type { ConsentStep, RegisterStep } from "#/pages/dashboard/model/next-steps";
import { Panel } from "#/shared/ui/panel";

import { NextStepList } from "./next-step-list.tsx";

const TITLE = "次にやること";

export const NextStepsPanel = ({
  consent,
  register,
  inviteUrl,
}: Readonly<{ consent: ConsentStep; register: RegisterStep; inviteUrl: string }>): ReactNode => (
  <Panel accent="border-lavender-deep">
    <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
    <NextStepList consent={consent} register={register} inviteUrl={inviteUrl} />
  </Panel>
);
