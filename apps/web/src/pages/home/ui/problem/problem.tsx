import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { ProblemDiagram } from "./problem-diagram";

const LEAD = "Slack も Notion も AI とつながるのに";
const TAIL = "Discord だけひとりぼっち";
const LABEL = "こまりごと";

const Problem = (): ReactNode => (
  <section id="why" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} tone="bg-pink" lead={LEAD} tail={TAIL} />
    <div className="border-ink bg-milk bg-dots shadow-pop overflow-x-auto rounded-3xl border-2 p-4 md:p-12">
      <ProblemDiagram />
    </div>
  </section>
);

export { Problem };
