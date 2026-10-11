import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { withdrawConsent } from "#/pages/dashboard/api/dashboard";
import { useReturnToDashboard } from "#/pages/dashboard/model/use-return-to-dashboard";
import { PopButton } from "#/shared/ui/pop-button";

const SUMMARY = "同意を取り消す";
const DETAIL = "保存したメッセージと検索用データをすべて削除します。元に戻せません。";
const CONFIRM = "同意を取り消してデータを削除する";
const MESSAGES = {
  idle: "",
  pending: "削除を始めています。",
  success: "削除を始めました。",
  error: "取り消せませんでした。",
} as const;

const RevokePanel = ({ guildId }: Readonly<{ guildId: string }>): ReactNode => {
  const returnToDashboard = useReturnToDashboard();
  const { mutate, status } = useMutation({
    mutationFn: withdrawConsent,
    onSuccess: (result) => {
      if (result.status !== "withdrawing") {
        return returnToDashboard("stay");
      }
      return returnToDashboard("leave");
    },
  });
  const revoke = useCallback(() => {
    mutate(guildId);
  }, [guildId, mutate]);
  return (
    <details className="bg-dc-sidebar border-dc-line rounded-2xl border px-6 py-4">
      <summary className="text-dc-bright font-maru cursor-pointer font-black">{SUMMARY}</summary>
      <p className="text-dc-muted mt-3">{DETAIL}</p>
      <div className="mt-4">
        <PopButton tone="danger" disabled={status === "pending"} onClick={revoke}>
          {CONFIRM}
        </PopButton>
      </div>
      <output className="mt-3 block">{MESSAGES[status]}</output>
    </details>
  );
};

export { RevokePanel };
