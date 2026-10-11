import { useLocation } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import { DiscordSignIn } from "#/features/sign-in";
import { DASHBOARD_PATH } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

const TIP = "おかえり！";
const TITLE = "mirucord にログイン";

const callbackUrlOf = (search: string): string | undefined =>
  Option.getOrUndefined(Option.liftPredicate(DASHBOARD_PATH, () => search === ""));

const SignInPage = (): ReactNode => {
  const search = useLocation({ select: ({ searchStr }) => searchStr });
  return (
    <AppFrame>
      <MascotTip>{TIP}</MascotTip>
      <Panel>
        <h1 className="text-3xl font-black">{TITLE}</h1>
        <DiscordSignIn callbackURL={callbackUrlOf(search)} />
      </Panel>
    </AppFrame>
  );
};

export { SignInPage };
