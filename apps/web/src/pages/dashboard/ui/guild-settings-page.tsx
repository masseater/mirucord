import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { guildPageQuery } from "#/pages/dashboard/api/dashboard";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { GuildSettingsView } from "./guild-settings-view";
import { SignInPanel } from "./sign-in-panel";

const BACK = "← サーバー一覧へ";
const NOT_MANAGED = "このサーバーの設定は開けません。";

const GuildSettingsPage = (): ReactNode => {
  const { guildId } = useParams({ from: "/dashboard/$guildId" });
  const { data } = useSuspenseQuery(guildPageQuery(guildId));
  return (
    <AppFrame>
      <Link to="/dashboard" className="text-ink-soft hover:text-grape self-start font-bold">
        {BACK}
      </Link>
      {data.status === "signedOut" && <SignInPanel returnTo={`/dashboard/${guildId}`} />}
      {data.status === "notManaged" && <MascotTip>{NOT_MANAGED}</MascotTip>}
      {data.status === "ready" && <GuildSettingsView settings={data.settings} />}
    </AppFrame>
  );
};

export { GuildSettingsPage };
