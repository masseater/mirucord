import type { ReactNode } from "react";

import { HeroActions } from "./hero-actions";
import { Hero } from "./hero/hero";
import { Marquee } from "./marquee";

const Opening = (): ReactNode => (
  <>
    <Hero />
    <HeroActions />
    <Marquee />
  </>
);

export { Opening };
