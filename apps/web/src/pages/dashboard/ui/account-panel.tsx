import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { Panel } from "#/shared/ui/panel";
import { PopButton } from "#/shared/ui/pop-button";

import { DeleteAccount } from "./delete-account";
import { EraseOwnMessages } from "./erase-own-messages";

const TITLE = "アカウント";
const SIGN_OUT = "ログアウト";
const FAILED = "ログアウトできませんでした。";

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
        <p role="alert" className="bg-pink text-ink rounded-2xl px-4 py-2 text-sm font-bold">
          {FAILED}
        </p>
      )}
      <EraseOwnMessages />
      <DeleteAccount />
    </Panel>
  );
};

export { AccountPanel };
