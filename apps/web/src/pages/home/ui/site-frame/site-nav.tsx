import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { DASHBOARD_PATH } from "#/shared/config";
import { PopLink } from "#/shared/ui/pop-link";

import { NavLinks } from "./nav-links";

const BRAND = "mirucord";
const SIGN_IN = "ログイン";

const SiteNav = (): ReactNode => (
  <header className="relative z-10 mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5">
    <a href="#top" className="flex items-center gap-2 text-2xl font-black no-underline">
      <Mascot className="size-10" />
      {BRAND}
    </a>
    <NavLinks />
    <PopLink href={DASHBOARD_PATH} tone="blurple" size="sm">
      {SIGN_IN}
    </PopLink>
  </header>
);

export { SiteNav };
