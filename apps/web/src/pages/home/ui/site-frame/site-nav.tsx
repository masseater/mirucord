import type { ReactNode } from "react";

import { CtaLink } from "#/pages/home/ui/common/cta-link";

import { NavLinks } from "./nav-links";

const BRAND = "mirucord";
const SEAL = "見";
const START = "無料で始める";

const SiteNav = (): ReactNode => (
  <header className="mx-auto flex h-18 w-full max-w-6xl items-center justify-between px-5">
    <a
      href="#top"
      className="font-mincho flex items-center gap-2.5 text-2xl font-black no-underline"
    >
      <span className="bg-shu text-paper grid size-8 place-items-center rounded-sm text-lg">
        {SEAL}
      </span>
      {BRAND}
    </a>
    <NavLinks />
    <CtaLink href="#start" tone="shu" size="sm">
      {START}
    </CtaLink>
  </header>
);

export { SiteNav };
