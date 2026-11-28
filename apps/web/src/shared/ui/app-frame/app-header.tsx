import type { ReactNode } from "react";

import { DASHBOARD_NAME, DASHBOARD_PATH } from "#/shared/config";

import { BrandLink } from "./brand-link.tsx";

export const AppHeader = (): ReactNode => (
  <header className="bg-dc-rail">
    <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
      <BrandLink />
      <a
        href={DASHBOARD_PATH}
        className="text-dc-muted hover:text-dc-bright text-sm font-bold no-underline"
      >
        {DASHBOARD_NAME}
      </a>
    </div>
  </header>
);
