import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Effect } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { dashboardQuery, withdrawConsent } from "#/pages/dashboard/api/dashboard";
import { DASHBOARD_PATH } from "#/shared/config";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const leave = (result: Awaited<ReturnType<typeof withdrawConsent>>): Effect.Effect<void> => {
    if (result.status !== "withdrawing") {
      return Effect.void;
    }
    return Effect.promise(() => navigate({ to: DASHBOARD_PATH }));
  };
  const refreshDashboard = Effect.promise(() =>
    queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
  );
  const afterRevoke = (result: Awaited<ReturnType<typeof withdrawConsent>>): Effect.Effect<void> =>
    refreshDashboard.pipe(Effect.andThen(leave(result)));
  const { mutate, status } = useMutation({
    mutationFn: withdrawConsent,
    onSuccess: (result) => Effect.runPromise(afterRevoke(result)),
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
