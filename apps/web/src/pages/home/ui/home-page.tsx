import type { ReactNode } from "react";

import { Closing } from "./closing/closing";
import { Faq } from "./faq/faq";
import { Features } from "./features/features";
import { Flow } from "./flow/flow";
import { Hero } from "./hero/hero";
import { Problem } from "./problem/problem";
import { Safety } from "./safety/safety";
import { SiteFrame } from "./site-frame/site-frame";
import { Steps } from "./steps/steps";

const HomePage = (): ReactNode => (
  <SiteFrame>
    <Hero />
    <Problem />
    <Flow />
    <Features />
    <Steps />
    <Safety />
    <Faq />
    <Closing />
  </SiteFrame>
);

export { HomePage };
