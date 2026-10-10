import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { dashboardQuery, withdrawConsent } from "#/pages/dashboard/api/dashboard";
import { PopButton } from "#/shared/ui/pop-button";

const SUMMARY = "同意を取り消す";
const DETAIL =
  "取り消すと読み取りを止め、このサーバーから保存したメッセージと検索用データをすべて削除します。削除したデータは元に戻せません。";
const CONFIRM = "同意を取り消してデータを削除する";
const MESSAGES = {
  idle: "",
  pending: "",
  success: "同意を取り消し、保存していたデータを削除しました。",
  error: "取り消せませんでした。もう一度お試しください。",
} as const;

const RevokePanel = ({ guildId }: Readonly<{ guildId: string }>): ReactNode => {
  const queryClient = useQueryClient();
  const { mutate, status } = useMutation({
    mutationFn: withdrawConsent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
  });
  const revoke = useCallback(() => {
    mutate(guildId);
  }, [guildId, mutate]);
  return (
    <details className="border-ink bg-milk shadow-pop-sm rounded-3xl border-2 px-6 py-4">
      <summary className="cursor-pointer font-black">{SUMMARY}</summary>
      <p className="text-ink-soft mt-3">{DETAIL}</p>
      <div className="mt-4">
        <PopButton tone="pink" disabled={status === "pending"} onClick={revoke}>
          {CONFIRM}
        </PopButton>
      </div>
      <output className="mt-3 block">{MESSAGES[status]}</output>
    </details>
  );
};

export { RevokePanel };
