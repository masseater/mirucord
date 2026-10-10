import type { ReactNode } from "react";

import { Mascot } from "#/pages/home/ui/common/mascot";

import { ClosingActions } from "./closing-actions";
import { ClosingTitle } from "./closing-title";

const Closing = (): ReactNode => (
  <section className="mx-auto w-full max-w-6xl px-5 pb-24">
    <div className="border-ink bg-lavender bg-dots shadow-pop relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl border-2 px-6 py-16 text-center md:py-20">
      <Mascot className="motion-safe:animate-float size-32 md:size-40" />
      <ClosingTitle />
      <ClosingActions />
    </div>
  </section>
);

export { Closing };
