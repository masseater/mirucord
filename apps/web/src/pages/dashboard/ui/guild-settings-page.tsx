import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { guildPageQuery } from "#/pages/dashboard/api/dashboard";

import { GuildSettingsView } from "./guild-settings-view";
import { SignInPanel } from "./sign-in-panel";

const BACK = "サーバー一覧へ戻る";
const NOT_MANAGED =
  "このサーバーの設定を開けません。Bot が入っていないか、あなたにサーバー管理の権限がありません。";

const GuildSettingsPage = (): ReactNode => {
  const { guildId } = useParams({ from: "/dashboard/$guildId" });
  const { data } = useSuspenseQuery(guildPageQuery(guildId));
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      <Link to="/dashboard" className="self-start underline">
        {BACK}
      </Link>
      {data.status === "signedOut" && <SignInPanel returnTo={`/dashboard/${guildId}`} />}
      {data.status === "notManaged" && <p role="alert">{NOT_MANAGED}</p>}
      {data.status === "ready" && <GuildSettingsView settings={data.settings} />}
    </main>
  );
};

export { GuildSettingsPage };
