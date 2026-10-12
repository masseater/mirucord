import { useLocation } from "@tanstack/react-router";
import { Option } from "effect";
import type { ReactNode } from "react";

import { DiscordSignIn, SIGN_IN_TIP } from "#/features/sign-in";
import { SERVICE_NAME, SIGN_IN_LANDING } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

const TITLE = `${SERVICE_NAME} にログイン`;

const callbackUrlOf = (search: string): string | undefined =>
  Option.getOrUndefined(Option.liftPredicate(SIGN_IN_LANDING, () => search === ""));

const SignInPage = (): ReactNode => {
  const search = useLocation({ select: ({ searchStr }) => searchStr });
  return (
    <AppFrame>
      <MascotTip>{SIGN_IN_TIP}</MascotTip>
      <Panel>
        <h1 className="sr-only">{TITLE}</h1>
        <DiscordSignIn callbackURL={callbackUrlOf(search)} />
      </Panel>
    </AppFrame>
  );
};

export { SignInPage };
