import type { ReactNode } from "react";

import type { GuildSettings } from "#/features/ingest/index.server";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { ConsentForm } from "./consent-form";
import { ConsentRecord } from "./consent-record";
import { GrantedPanels } from "./granted-panels";

const TIP = {
  awaiting: "よければ同意してね",
  waiting: "思い出を集めてるよ",
  backfilling: "思い出を集めてるよ",
  done: "思い出を集めたよ",
  withdrawing: "削除中だよ！",
} as const;

const GuildSettingsView = ({ settings }: Readonly<{ settings: GuildSettings }>): ReactNode => (
  <>
    <MascotTip>{TIP[settings.ingest]}</MascotTip>
    <h1 className="text-dc-bright font-maru text-3xl font-black">{settings.name}</h1>
    <ConsentRecord consent={settings.consent} />
    {settings.consent.status === "awaiting" && <ConsentForm settings={settings} />}
    {settings.consent.status === "granted" && <GrantedPanels settings={settings} />}
  </>
);

export { GuildSettingsView };
