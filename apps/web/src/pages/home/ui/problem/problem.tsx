import type { ReactNode } from "react";

import { SectionHead } from "#/pages/home/ui/common/section-head";

import { ProblemDiagram } from "./problem-diagram";

const LEAD = "Discord だけが";
const TAIL = "AI から見えない";
const LABEL = "壱 課題";

const Problem = (): ReactNode => (
  <section id="why" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 py-24 md:py-32">
    <SectionHead label={LABEL} lead={LEAD} tail={TAIL} />
    <div className="border-kinu bg-paper overflow-x-auto rounded-2xl border p-4 md:p-12">
      <ProblemDiagram />
    </div>
  </section>
);

export { Problem };
