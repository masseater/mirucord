import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

const BRAND = "mirucord";
const DASHBOARD = "管理画面";

const AppHeader = (): ReactNode => (
  <header className="mx-auto flex h-20 w-full max-w-3xl items-center justify-between px-5">
    <a href="/" className="flex items-center gap-2 text-2xl font-black no-underline">
      <Mascot className="size-10" />
      {BRAND}
    </a>
    <a href="/dashboard" className="hover:text-blurple text-sm font-bold no-underline">
      {DASHBOARD}
    </a>
  </header>
);

export { AppHeader };
