import type { ReactNode } from "react";

import { Closing } from "./closing/closing";
import { Faq } from "./faq/faq";
import { Safety } from "./safety/safety";
import { Steps } from "./steps/steps";

const Ending = (): ReactNode => (
  <>
    <Steps />
    <Safety />
    <Faq />
    <Closing />
  </>
);

export { Ending };
