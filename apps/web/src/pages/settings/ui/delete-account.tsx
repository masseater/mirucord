import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { authClient } from "#/shared/auth";
import { PopButton } from "#/shared/ui/pop-button";

const SUMMARY = "アカウントを削除する";
const DETAIL = "ログイン情報とアプリとのつながりを削除します。元に戻せません。";
const CONFIRM = "削除する";
const FAILED = "削除できませんでした。ログインし直してからもう一度試してください。";

const DeleteAccount = (): ReactNode => {
  const navigate = useNavigate();
  const { mutate, status } = useMutation({
    mutationFn: () => authClient.deleteUser({ fetchOptions: { throw: true } }),
    onSuccess: () => navigate({ to: "/", reloadDocument: true }),
  });
  const remove = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <details className="border-ink rounded-2xl border-2 px-4 py-3">
      <summary className="cursor-pointer font-bold">{SUMMARY}</summary>
      <p className="text-ink-soft mt-3">{DETAIL}</p>
      <div className="mt-4">
        <PopButton
          tone="pink"
          size="sm"
          disabled={status === "pending" || status === "success"}
          onClick={remove}
        >
          {CONFIRM}
        </PopButton>
      </div>
      {status === "error" && (
        <p role="alert" className="mt-3 text-sm font-bold">
          {FAILED}
        </p>
      )}
    </details>
  );
};

export { DeleteAccount };
