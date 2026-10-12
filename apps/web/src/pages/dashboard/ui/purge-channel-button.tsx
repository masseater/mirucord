import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { purgeStoredChannel } from "#/pages/dashboard/api/dashboard";
import { FORBIDDEN, mutationFeedback, SIGNED_OUT, success } from "#/pages/dashboard/lib/feedback";
import { useReturnToDashboard } from "#/pages/dashboard/model/use-return-to-dashboard";
import { PopButton } from "#/shared/ui/pop-button";

import { FeedbackLine } from "./feedback-line";

const LABEL = "今すぐ削除";
const RESULTS = {
  purged: Option.none(),
  notPaused: success("取り込みを再開したので削除しませんでした"),
  forbidden: FORBIDDEN,
  signedOut: SIGNED_OUT,
} as const;

const purgeFeedback = mutationFeedback({
  pending: Option.none(),
  failed: "削除できませんでした",
  result: (status: keyof typeof RESULTS) => RESULTS[status],
});

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
      <FeedbackLine feedback={purgeFeedback(status, Option.fromUndefinedOr(data))} />
    </>
  );
};

export { PurgeChannelButton };
