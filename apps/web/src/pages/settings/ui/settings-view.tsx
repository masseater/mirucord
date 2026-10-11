import type { ReactNode } from "react";

import type { Settings } from "#/pages/settings/api/settings.server";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { AccountPanel } from "./account-panel";
import { ConnectedAppPanel } from "./connected-app-panel";
import { McpUrlPanel } from "./mcp-url-panel";
import { ReadableGuildPanel } from "./readable-guild-panel";

const TITLE = "設定";

type ReadySettings = Extract<Settings, Readonly<{ status: "ready" }>>;

const SettingsView = ({ settings }: Readonly<{ settings: ReadySettings }>): ReactNode => (
  <>
    <MascotTip>{`${settings.name}さん、おかえり！`}</MascotTip>
    <h1 className="text-3xl font-black">{TITLE}</h1>
    <McpUrlPanel />
    <ReadableGuildPanel listing={settings.guilds} />
    <ConnectedAppPanel apps={settings.apps} />
    <AccountPanel name={settings.name} />
  </>
);

export { SettingsView };
