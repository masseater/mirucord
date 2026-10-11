import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { DASHBOARD_PATH, SETTINGS_PATH } from "#/shared/config";

const BRAND = "mirucord";
const DASHBOARD = "管理画面";
const SETTINGS = "設定";

const AppHeader = (): ReactNode => (
  <header className="mx-auto flex h-20 w-full max-w-3xl items-center justify-between px-5">
    <a href="/" className="flex items-center gap-2 text-2xl font-black no-underline">
      <Mascot className="size-10" />
      {BRAND}
    </a>
    <nav className="flex items-center gap-5 text-sm font-bold">
      <a href={SETTINGS_PATH} className="hover:text-grape no-underline">
        {SETTINGS}
      </a>
      <a href={DASHBOARD_PATH} className="hover:text-grape no-underline">
        {DASHBOARD}
      </a>
    </nav>
  </header>
);

export { AppHeader };
