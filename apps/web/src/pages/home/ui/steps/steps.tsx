import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { StepList } from "./step-list";

const LEAD = "3 ステップで";
const TAIL = "すぐ使える";
const LABEL = "はじめかた";

const Steps = (): ReactNode => (
  <section id="start" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} tone="bg-butter" lead={LEAD} tail={TAIL} />
    <StepList />
  </section>
);

export { Steps };
