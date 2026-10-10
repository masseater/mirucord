import type { ReactNode } from "react";

import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

const SiteFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-washi text-sumi min-h-dvh overflow-x-hidden font-sans antialiased scheme-light">
    <SiteNav />
    <main>{children}</main>
    <SiteFooter />
  </div>
);

export { SiteFrame };
