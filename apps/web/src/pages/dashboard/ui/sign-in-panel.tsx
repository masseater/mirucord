import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

const TIP = "サーバーの管理者さん向けだよ";
const TITLE = "ログインして管理画面へ";
const SIGN_IN = "Discord でログイン";
const FAILED = "ログインできませんでした。";

const SignInPanel = ({ returnTo }: Readonly<{ returnTo: string }>): ReactNode => {
  const { mutate, status } = useMutation({
    mutationFn: () =>
      authClient.signIn.social({
        provider: "discord",
        callbackURL: returnTo,
        fetchOptions: { throw: true },
      }),
  });
  const startSignIn = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <>
      <MascotTip>{TIP}</MascotTip>
      <Panel>
        <h1 className="text-2xl font-black">{TITLE}</h1>
        <PopButton
          tone="grape"
          disabled={status === "pending" || status === "success"}
          onClick={startSignIn}
        >
          {SIGN_IN}
        </PopButton>
        {status === "error" && <p role="alert">{FAILED}</p>}
      </Panel>
    </>
  );
};

export { SignInPanel };
