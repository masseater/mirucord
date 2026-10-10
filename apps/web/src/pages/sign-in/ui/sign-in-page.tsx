import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

const TIP = "おかえり！";
const TITLE = "mirucord にログイン";
const SIGN_IN = "Discord でログイン";
const FAILED = "ログインできませんでした。";

const DASHBOARD_PATH = "/dashboard";

const callbackUrlOf = (search: string): string | undefined =>
  Option.getOrUndefined(Option.liftPredicate(DASHBOARD_PATH, () => search === ""));

const signInWithDiscord = (): Promise<unknown> =>
  authClient.signIn.social({
    provider: "discord",
    callbackURL: callbackUrlOf(globalThis.location.search),
    fetchOptions: { throw: true },
  });

const SignInPage = (): ReactNode => {
  const { mutate, status } = useMutation({ mutationFn: signInWithDiscord });
  const startSignIn = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <AppFrame>
      <MascotTip>{TIP}</MascotTip>
      <Panel>
        <h1 className="text-3xl font-black">{TITLE}</h1>
        <PopButton
          tone="grape"
          disabled={status === "pending" || status === "success"}
          onClick={startSignIn}
        >
          {SIGN_IN}
        </PopButton>
        {status === "error" && (
          <p role="alert" className="bg-pink rounded-2xl px-4 py-2 text-sm font-bold">
            {FAILED}
          </p>
        )}
      </Panel>
    </AppFrame>
  );
};

export { SignInPage };
