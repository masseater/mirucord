import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { StepList } from "./step-list";

const LEAD = "三つの手順で";
const TAIL = "使い始める";
const LABEL = "四 導入";

const Steps = (): ReactNode => (
  <section id="start" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} lead={LEAD} tail={TAIL} />
    <StepList />
  </section>
);

export { Steps };
