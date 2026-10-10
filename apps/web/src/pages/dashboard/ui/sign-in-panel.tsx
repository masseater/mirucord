import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

const TIP = "管理画面はサーバーの管理者さん向けです。まずは Discord でログインしてね。";
const TITLE = "ログインして管理画面へ";
const SUMMARY = "Discord からはユーザー ID と表示名だけを受け取ります。";
const SIGN_IN = "Discord でログイン";
const FAILED = "ログインできませんでした。もう一度お試しください。";

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
        <p className="text-ink-soft">{SUMMARY}</p>
        <PopButton tone="grape" disabled={status === "pending"} onClick={startSignIn}>
          {SIGN_IN}
        </PopButton>
        {status === "error" && <p role="alert">{FAILED}</p>}
      </Panel>
    </>
  );
};

export { SignInPanel };
