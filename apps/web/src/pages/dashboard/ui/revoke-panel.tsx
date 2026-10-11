import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
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
  error: "取り消せませんでした。少し待ってからもう一度押してください。",
} as const;
const RESULT_MESSAGES = {
  withdrawing: "削除を始めました。",
  forbidden:
    "このサーバーを管理する権限が確認できなかったので、取り消せませんでした。Discord で「サーバー管理」の権限があるアカウントでログインしてください。",
  signedOut: "ログインの期限が切れたので、取り消せませんでした。もう一度ログインしてください。",
} as const;

const revokeMessage = (
  status: keyof typeof MESSAGES | "success",
  result: Option.Option<Readonly<{ status: keyof typeof RESULT_MESSAGES }>>,
): string => {
  if (status !== "success") {
    return MESSAGES[status];
  }
  return Option.match(result, {
    onNone: () => MESSAGES.idle,
    onSome: (answered) => RESULT_MESSAGES[answered.status],
  });
};

const RevokePanel = ({ guildId }: Readonly<{ guildId: string }>): ReactNode => {
  const returnToDashboard = useReturnToDashboard();
  const { mutate, status, data } = useMutation({
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
      <output className="mt-3 block">{revokeMessage(status, Option.fromUndefinedOr(data))}</output>
    </details>
  );
};

export { RevokePanel };
