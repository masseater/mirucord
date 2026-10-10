import type { ReactNode } from "react";

import { HeroStage } from "./hero-stage";
import { HeroTitle } from "./hero-title";
import { Marquee } from "./marquee";

const Hero = (): ReactNode => (
  <>
    <section
      id="top"
      className="relative mx-auto grid w-full max-w-6xl items-center gap-16 px-5 pt-8 pb-28 lg:grid-cols-2 lg:gap-12 lg:pt-14"
    >
      <span
        aria-hidden="true"
        className="bg-pink pointer-events-none absolute -top-24 -left-24 size-80 rounded-full opacity-70 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="bg-mint pointer-events-none absolute top-40 -right-24 size-96 rounded-full opacity-70 blur-3xl"
      />
      <HeroTitle />
      <HeroStage />
    </section>
    <Marquee />
  </>
);

export { Hero };
