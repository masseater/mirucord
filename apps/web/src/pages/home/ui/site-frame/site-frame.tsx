import type { ReactNode } from "react";

import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

const SiteFrame = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="bg-cream text-ink font-maru min-h-dvh overflow-x-hidden antialiased scheme-light">
    <SiteNav />
    <main>{children}</main>
    <SiteFooter />
  </div>
);

export { SiteFrame };
