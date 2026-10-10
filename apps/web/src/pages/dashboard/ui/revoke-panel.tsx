import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { dashboardQuery, withdrawConsent } from "#/pages/dashboard/api/dashboard";

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
    <details className="rounded border px-4 py-3">
      <summary className="cursor-pointer font-bold">{SUMMARY}</summary>
      <p className="mt-3">{DETAIL}</p>
      <button
        type="button"
        className="border-pink-deep text-pink-deep mt-3 rounded border px-4 py-2 disabled:opacity-50"
        disabled={status === "pending"}
        onClick={revoke}
      >
        {CONFIRM}
      </button>
      <output className="mt-3 block">{MESSAGES[status]}</output>
    </details>
  );
};

export { RevokePanel };
