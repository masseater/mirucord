import type { ReactNode } from "react";

import type { ConnectedApp } from "#/shared/auth/index.server";

import { AccountPanel } from "./account-panel";
import { ConnectedAppPanel } from "./connected-app-panel";
import { LinkedAccountPanel } from "./linked-account-panel";

const AccountPanels = ({
  apps,
  name,
}: Readonly<{ apps: readonly ConnectedApp[]; name: string }>): ReactNode => (
  <>
    <ConnectedAppPanel apps={apps} />
    <LinkedAccountPanel />
    <AccountPanel name={name} />
  </>
);

export { AccountPanels };
