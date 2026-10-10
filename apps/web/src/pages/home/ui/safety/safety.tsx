import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { SpecList } from "./spec-list";

const LEAD = "大事な会話だから";
const TAIL = "ていねいに預かります";
const LABEL = "あんしん";

const Safety = (): ReactNode => (
  <section id="safety" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} tone="bg-lavender" lead={LEAD} tail={TAIL} />
    <SpecList />
  </section>
);

export { Safety };
