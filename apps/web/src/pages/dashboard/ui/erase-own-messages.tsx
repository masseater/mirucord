import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { eraseMyMessages } from "#/pages/dashboard/api/dashboard";
import { mutationMessage } from "#/pages/dashboard/lib/mutation-message";
import { PopButton } from "#/shared/ui/pop-button";

const SUMMARY = "自分の投稿を削除する";
const DETAIL =
  "このサーバーで保存したあなたの投稿を削除し、これからも保存しません。Discord の投稿は消えません。元に戻せません。";
const CONFIRM = "削除する";
const MESSAGES = {
  idle: "",
  pending: "削除しています。",
  error: "削除できませんでした。少し待ってからもう一度押してください。",
} as const;
const RESULT_MESSAGES = {
  erased: "削除しました。",
  notFound: "このサーバーは見つかりませんでした。",
  signedOut: "ログインの期限が切れたので、削除できませんでした。もう一度ログインしてください。",
} as const;

const eraseMessage = mutationMessage({
  messages: MESSAGES,
  resultMessage: (status: keyof typeof RESULT_MESSAGES) => RESULT_MESSAGES[status],
});

const EraseOwnMessages = ({ guildId }: Readonly<{ guildId: string }>): ReactNode => {
  const { mutate, status, data } = useMutation({ mutationFn: eraseMyMessages });
  const erase = useCallback(() => {
    mutate(guildId);
  }, [guildId, mutate]);
  return (
    <details>
      <summary className="text-dc-muted cursor-pointer text-sm font-bold">{SUMMARY}</summary>
      <p className="text-dc-muted mt-3">{DETAIL}</p>
      <div className="mt-4">
        <PopButton
          tone="danger"
          size="sm"
          disabled={status === "pending" || (status === "success" && data.status === "erased")}
          onClick={erase}
        >
          {CONFIRM}
        </PopButton>
      </div>
      <output className="mt-3 block text-sm font-bold">
        {eraseMessage(status, Option.fromUndefinedOr(data))}
      </output>
    </details>
  );
};

export { EraseOwnMessages };
