import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { purgeStoredChannel } from "#/pages/dashboard/api/dashboard";
import { useReturnToDashboard } from "#/pages/dashboard/model/use-return-to-dashboard";
import { MASCOT_NAME } from "#/shared/config";
import { PopButton } from "#/shared/ui/pop-button";

const LABEL = "今すぐ削除";
const FAILED = "削除できませんでした。少し待ってからもう一度押してください";
const SILENT = "";
const RESULT_MESSAGES = {
  purged: SILENT,
  notPaused: `${MASCOT_NAME}がまたこのチャンネルを見られるようになったので、削除しませんでした`,
  forbidden: "このサーバーを管理する権限が確認できなかったので、削除できませんでした",
  signedOut: "ログインの期限が切れたので、削除できませんでした。もう一度ログインしてください",
} as const;

const purgeMessage = (
  status: "idle" | "pending" | "success" | "error",
  result: Option.Option<Readonly<{ status: keyof typeof RESULT_MESSAGES }>>,
): string => {
  if (status === "error") {
    return FAILED;
  }
  return result.pipe(
    Option.filter(() => status === "success"),
    Option.map((answered) => RESULT_MESSAGES[answered.status]),
    Option.getOrElse(() => SILENT),
  );
};

const PurgeChannelButton = ({
  guildId,
  channelId,
  channelName,
}: Readonly<{ guildId: string; channelId: string; channelName: string }>): ReactNode => {
  const returnToDashboard = useReturnToDashboard();
  const { mutate, status, data } = useMutation({
    mutationFn: purgeStoredChannel,
    onSuccess: () => returnToDashboard("stay"),
  });
  const purge = useCallback(() => {
    mutate({ guildId, channelId });
  }, [channelId, guildId, mutate]);
  return (
    <>
      <PopButton tone="danger" size="sm" disabled={status === "pending"} onClick={purge}>
        {LABEL}
        <span className="sr-only">{`（#${channelName}）`}</span>
      </PopButton>
      <span role="alert" className="text-xs font-bold">
        {purgeMessage(status, Option.fromUndefinedOr(data))}
      </span>
    </>
  );
};

export { PurgeChannelButton };
