import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";

const TITLE = "Sign in to mirucord";
const SUMMARY = "mirucord only asks Discord for your user ID and name.";
const SIGN_IN = "Sign in with Discord";
const FAILED = "Sign-in failed. Please try again.";

const signInWithDiscord = (): Promise<unknown> =>
  authClient.signIn.social({ provider: "discord", fetchOptions: { throw: true } });

const SignInPage = (): ReactNode => {
  const { mutate, status } = useMutation({ mutationFn: signInWithDiscord });
  const startSignIn = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">{TITLE}</h1>
      <p>{SUMMARY}</p>
      <button
        type="button"
        className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50"
        disabled={status === "pending"}
        onClick={startSignIn}
      >
        {SIGN_IN}
      </button>
      {status === "error" && <p role="alert">{FAILED}</p>}
    </main>
  );
};

export { SignInPage };
