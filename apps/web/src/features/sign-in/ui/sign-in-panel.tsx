import type { ReactNode } from "react";

import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

import { DiscordSignIn } from "./discord-sign-in";

const SignInPanel = ({
  tip,
  title,
  returnTo,
}: Readonly<{ tip: string; title: string; returnTo: string }>): ReactNode => (
  <>
    <MascotTip>{tip}</MascotTip>
    <Panel>
      <h1 className="text-dc-bright font-maru text-2xl font-black">{title}</h1>
      <DiscordSignIn callbackURL={returnTo} />
    </Panel>
  </>
);

export { SignInPanel };
