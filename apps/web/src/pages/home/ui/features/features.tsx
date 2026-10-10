import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { FeatureGrid } from "./feature-grid";

const LEAD = "ミルは見るだけ";
const TAIL = "見ていい所だけ";
const GUIDE = "読むだけだから安心してね";
const LABEL = "とくちょう";

const Features = (): ReactNode => (
  <section className="mx-auto w-full max-w-6xl px-5 py-24 md:py-32">
    <SectionHead label={LABEL} guide={GUIDE} tone="bg-butter" lead={LEAD} tail={TAIL} />
    <FeatureGrid />
  </section>
);

export { Features };
