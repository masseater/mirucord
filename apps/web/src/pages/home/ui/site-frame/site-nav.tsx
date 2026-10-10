import type { ReactNode } from "react";

import { CtaLink } from "#/pages/home/ui/common/cta-link";
import { Mascot } from "#/pages/home/ui/common/mascot";

import { NavLinks } from "./nav-links";

const BRAND = "mirucord";
const START = "無料ではじめる";

const SiteNav = (): ReactNode => (
  <header className="relative z-10 mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5">
    <a href="#top" className="flex items-center gap-2 text-2xl font-black no-underline">
      <Mascot className="size-10" />
      {BRAND}
    </a>
    <NavLinks />
    <CtaLink href="#start" tone="blurple" size="sm">
      {START}
    </CtaLink>
  </header>
);

export { SiteNav };
