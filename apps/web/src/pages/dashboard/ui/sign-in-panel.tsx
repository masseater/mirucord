import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";

const TITLE = "管理画面を開くにはログインしてください";
const SUMMARY = "Discord のユーザー ID と表示名だけを使ってログインします。";
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
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{TITLE}</h1>
      <p>{SUMMARY}</p>
      <button
        type="button"
        className="bg-primary text-primary-foreground self-start rounded px-4 py-2 disabled:opacity-50"
        disabled={status === "pending"}
        onClick={startSignIn}
      >
        {SIGN_IN}
      </button>
      {status === "error" && <p role="alert">{FAILED}</p>}
    </section>
  );
};

export { SignInPanel };
