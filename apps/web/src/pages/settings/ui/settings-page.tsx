import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { SignInPanel } from "#/features/sign-in";
import { settingsQuery } from "#/pages/settings/api/settings";
import { SETTINGS_PATH } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";

import { SettingsView } from "./settings-view";

const SIGNED_OUT_TIP = "あなたの設定はここだよ";
const SIGNED_OUT_TITLE = "ログインして設定へ";

const SettingsPage = (): ReactNode => {
  const { data } = useSuspenseQuery(settingsQuery);
  return (
    <AppFrame>
      {data.status === "signedOut" && (
        <SignInPanel tip={SIGNED_OUT_TIP} title={SIGNED_OUT_TITLE} returnTo={SETTINGS_PATH} />
      )}
      {data.status === "ready" && <SettingsView settings={data} />}
    </AppFrame>
  );
};

export { SettingsPage };
