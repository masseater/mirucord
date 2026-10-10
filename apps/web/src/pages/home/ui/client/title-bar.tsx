import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { DASHBOARD_PATH } from "#/shared/config";

const BRAND = "mirucord";
const SIGN_IN = "ログイン";
const UNOFFICIAL = "Discord 非公式";

const TitleBar = (): ReactNode => (
  <header className="bg-dc-rail flex h-10 items-center justify-between px-3">
    <a href="#top" className="text-dc-bright flex items-center gap-2 font-bold no-underline">
      <Mascot className="size-6" />
      {BRAND}
      <span className="text-dc-muted text-xs font-bold">{UNOFFICIAL}</span>
    </a>
    <a
      href={DASHBOARD_PATH}
      className="bg-grape hover:bg-grape/85 text-dc-bright rounded-full px-3 py-1 text-sm font-bold no-underline"
    >
      {SIGN_IN}
    </a>
  </header>
);

export { TitleBar };
