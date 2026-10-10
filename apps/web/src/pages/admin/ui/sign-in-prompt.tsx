import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";

const SIGN_IN = "Sign in with Discord";
const FAILED = "Sign-in failed. Please try again.";
const ADMIN_PATH = "/admin";

const signInToAdmin = (): Promise<unknown> =>
  authClient.signIn.social({
    provider: "discord",
    callbackURL: ADMIN_PATH,
    fetchOptions: { throw: true },
  });

const SignInPrompt = (): ReactNode => {
  const { mutate, status } = useMutation({ mutationFn: signInToAdmin });
  const startSignIn = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50"
        disabled={status === "pending"}
        onClick={startSignIn}
      >
        {SIGN_IN}
      </button>
      {status === "error" && <p role="alert">{FAILED}</p>}
    </div>
  );
};

export { SignInPrompt };
