import type { ReactNode } from "react";

import { HeroStage } from "./hero-stage";
import { HeroTitle } from "./hero-title";

const Hero = (): ReactNode => (
  <section
    id="top"
    className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-6 lg:grid-cols-12 lg:gap-14 lg:pt-10"
  >
    <HeroStage />
    <HeroTitle />
  </section>
);

export { Hero };
