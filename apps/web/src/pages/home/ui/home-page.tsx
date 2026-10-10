import type { ReactNode } from "react";

import { ClientFrame } from "./client/client-frame";
import { Faq } from "./faq/faq";
import { Features } from "./features/features";
import { Flow } from "./flow/flow";
import { Hero } from "./hero/hero";
import { Problem } from "./problem/problem";
import { Safety } from "./safety/safety";
import { Steps } from "./steps/steps";

const HomePage = (): ReactNode => (
  <ClientFrame>
    <Hero />
    <Problem />
    <Flow />
    <Features />
    <Steps />
    <Safety />
    <Faq />
  </ClientFrame>
);

export { HomePage };
