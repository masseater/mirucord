import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

const SIGN_IN = "Discord でログイン";
const FAILED = "ログインできませんでした";

const DiscordSignIn = ({
  callbackURL,
}: Readonly<{ callbackURL: string | undefined }>): ReactNode => {
  const { mutate, status } = useMutation({
    mutationFn: () =>
      authClient.signIn.social({ provider: "discord", callbackURL, fetchOptions: { throw: true } }),
  });
  const startSignIn = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <>
      <PopButton
        tone="primary"
        disabled={status === "pending" || status === "success"}
        onClick={startSignIn}
      >
        {SIGN_IN}
      </PopButton>
      {status === "error" && (
        <IconLine icon="alert" role="alert" tone="strong" size="sm">
          {FAILED}
        </IconLine>
      )}
    </>
  );
};

export { DiscordSignIn };
