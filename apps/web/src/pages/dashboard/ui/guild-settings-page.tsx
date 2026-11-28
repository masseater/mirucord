import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { SignInPanel } from "#/features/sign-in";
import { guildPageQuery } from "#/pages/dashboard/api/dashboard";
import { DASHBOARD_NAME, DASHBOARD_PATH } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";

import { GuildSettingsView } from "./guild-settings-view.tsx";

const BACK = "サーバー一覧";
const NOT_MANAGED = "このサーバーの設定は開けないよ";

export const GuildSettingsPage = (): ReactNode => {
  const { guildId } = useParams({ from: "/dashboard/$guildId" });
  const { data } = useSuspenseQuery(guildPageQuery(guildId));
  return (
    <AppFrame>
      <Link
        to="/dashboard"
        className="text-dc-muted hover:text-dc-bright flex items-center gap-1 self-start font-bold"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {BACK}
      </Link>
      {data.status === "signedOut" && (
        <SignInPanel title={DASHBOARD_NAME} returnTo={`${DASHBOARD_PATH}/${guildId}`} />
      )}
      {data.status === "notManaged" && <MascotTip>{NOT_MANAGED}</MascotTip>}
      {data.status === "ready" && <GuildSettingsView settings={data.settings} />}
    </AppFrame>
  );
};
