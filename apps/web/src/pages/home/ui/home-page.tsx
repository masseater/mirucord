import type { ReactNode } from "react";

import { Ending } from "./ending/ending";
import { Features } from "./features/features";
import { Flow } from "./flow/flow";
import { Opening } from "./opening/opening";
import { Problem } from "./problem/problem";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav/site-nav";

const HomePage = (): ReactNode => (
  <div className="bg-washi text-sumi min-h-dvh overflow-x-hidden font-sans antialiased scheme-light">
    <SiteNav />
    <main>
      <Opening />
      <Problem />
      <Flow />
      <Features />
      <Ending />
    </main>
    <SiteFooter />
  </div>
);

export { HomePage };
