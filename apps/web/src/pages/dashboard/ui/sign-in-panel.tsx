import type { ReactNode } from "react";

import { DiscordSignIn } from "#/shared/ui/discord-sign-in";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

const TIP = "サーバーの管理者さん向けだよ";
const TITLE = "ログインして管理画面へ";

const SignInPanel = ({ returnTo }: Readonly<{ returnTo: string }>): ReactNode => (
  <>
    <MascotTip>{TIP}</MascotTip>
    <Panel>
      <h1 className="text-2xl font-black">{TITLE}</h1>
      <DiscordSignIn callbackURL={returnTo} />
    </Panel>
  </>
);

export { SignInPanel };
