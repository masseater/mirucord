import type { ReactNode } from "react";

import { DASHBOARD_PATH } from "#/shared/config";

import { BrandLink } from "./brand-link";

const DASHBOARD = "管理画面";

const AppHeader = (): ReactNode => (
  <header className="bg-dc-rail">
    <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5">
      <BrandLink />
      <a
        href={DASHBOARD_PATH}
        className="text-dc-muted hover:text-dc-bright text-sm font-bold no-underline"
      >
        {DASHBOARD}
      </a>
    </div>
  </header>
);

export { AppHeader };
