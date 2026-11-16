import type { ReactNode } from "react";

import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

import { DiscordSignIn } from "./discord-sign-in";
import { SIGN_IN_TIP } from "./sign-in-tip";

export const SignInPanel = ({
  title,
  returnTo,
}: Readonly<{ title: string; returnTo: string }>): ReactNode => (
  <>
    <MascotTip>{SIGN_IN_TIP}</MascotTip>
    <Panel>
      <h1 className="text-dc-bright font-maru text-2xl font-black">{title}</h1>
      <DiscordSignIn callbackURL={returnTo} />
    </Panel>
  </>
);
