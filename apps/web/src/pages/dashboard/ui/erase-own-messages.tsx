import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { eraseMyMessages } from "#/pages/dashboard/api/dashboard";
import {
  failure,
  mutationFeedback,
  progress,
  SIGNED_OUT,
  success,
} from "#/pages/dashboard/lib/feedback";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

import { FeedbackLine } from "./feedback-line";

const SUMMARY = "自分の投稿を削除する";
const IRREVERSIBLE = "元に戻せません";
const DISCORD_KEPT = "Discord の投稿は残ります";
const CONFIRM = "自分の投稿を削除";
const RESULTS = {
  erased: success("削除しました"),
  notFound: failure("このサーバーは見つかりません"),
  signedOut: SIGNED_OUT,
} as const;

const eraseFeedback = mutationFeedback({
  pending: progress("削除しています"),
  failed: "削除できませんでした",
  result: (status: keyof typeof RESULTS) => RESULTS[status],
});

const EraseOwnMessages = ({ guildId }: Readonly<{ guildId: string }>): ReactNode => {
  const { mutate, status, data } = useMutation({ mutationFn: eraseMyMessages });
  const erase = useCallback(() => {
    mutate(guildId);
  }, [guildId, mutate]);
  return (
    <details>
      <summary className="text-dc-muted cursor-pointer text-sm font-bold">{SUMMARY}</summary>
      <div className="text-dc-muted mt-3 flex flex-col gap-1">
        <IconLine icon="warning">{IRREVERSIBLE}</IconLine>
        <IconLine icon="message">{DISCORD_KEPT}</IconLine>
      </div>
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
      <div className="mt-3">
        <FeedbackLine feedback={eraseFeedback(status, Option.fromUndefinedOr(data))} />
      </div>
    </details>
  );
};

export { EraseOwnMessages };
