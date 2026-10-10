import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { FlowDiagram } from "./flow-diagram";

const LEAD = "ミルが";
const TAIL = "思い出をさがしてくる";
const GUIDE = "まかせてね";
const LABEL = "しくみ";

const Flow = (): ReactNode => (
  <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} guide={GUIDE} tone="bg-sky" lead={LEAD} tail={TAIL} />
    <div className="border-ink bg-milk bg-dots shadow-pop overflow-x-auto rounded-3xl border-2 p-4 md:p-12">
      <FlowDiagram />
    </div>
  </section>
);

export { Flow };
