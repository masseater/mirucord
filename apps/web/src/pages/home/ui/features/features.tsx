import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { FeatureGrid } from "./feature-grid";

const LEAD = "読むだけ";
const TAIL = "見える範囲だけ";
const LABEL = "とくちょう";

const Features = (): ReactNode => (
  <section className="mx-auto w-full max-w-6xl px-5 py-24 md:py-32">
    <SectionHead label={LABEL} tone="bg-mint" lead={LEAD} tail={TAIL} />
    <FeatureGrid />
  </section>
);

export { Features };
