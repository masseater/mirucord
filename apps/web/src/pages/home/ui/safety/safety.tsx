import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { SpecList } from "./spec-list";

const LEAD = "預かるものと";
const TAIL = "預からないもの";
const LABEL = "伍 安全性";

const Safety = (): ReactNode => (
  <section id="safety" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} lead={LEAD} tail={TAIL} />
    <SpecList />
  </section>
);

export { Safety };
