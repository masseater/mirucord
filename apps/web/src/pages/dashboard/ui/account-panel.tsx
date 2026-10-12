import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { IconLine } from "#/shared/ui/icon-line";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

import { DeleteAccount } from "./delete-account";

const TITLE = "アカウント";
const SIGN_OUT = "ログアウト";
const FAILED = "ログアウトできませんでした";

const AccountPanel = ({ name }: Readonly<{ name: string }>): ReactNode => {
  const navigate = useNavigate();
  const { mutate, status } = useMutation({
    mutationFn: () => authClient.signOut({ fetchOptions: { throw: true } }),
    onSuccess: () => navigate({ to: "/", reloadDocument: true }),
  });
  const signOut = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <Panel>
      <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
      <p className="font-bold">{name}</p>
      <PopButton
        tone="secondary"
        size="sm"
        disabled={status === "pending" || status === "success"}
        onClick={signOut}
      >
        {SIGN_OUT}
      </PopButton>
      {status === "error" && (
        <IconLine icon="alert" role="alert" tone="strong" size="sm">
          {FAILED}
        </IconLine>
      )}
      <DeleteAccount />
    </Panel>
  );
};

export { AccountPanel };
