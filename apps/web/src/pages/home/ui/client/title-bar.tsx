import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { DASHBOARD_PATH, SERVICE_NAME } from "#/shared/config";
import { Header } from "#/shared/ui/header";

const BRAND = SERVICE_NAME;
const SIGN_IN = "ログイン";
const UNOFFICIAL = "Discord 非公式";

export const TitleBar = (): ReactNode => (
  <Header layout="chat">
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
  </Header>
);
