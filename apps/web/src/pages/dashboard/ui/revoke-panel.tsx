import { useMutation } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { withdrawConsent } from "#/pages/dashboard/api/dashboard";
import { FORBIDDEN, mutationFeedback, SIGNED_OUT } from "#/pages/dashboard/lib/feedback";
import { useReturnToDashboard } from "#/pages/dashboard/model/use-return-to-dashboard";
import { IconLine } from "#/shared/ui/icon-line";
import { PopButton } from "#/shared/ui/pop-button";

import { FeedbackLine } from "./feedback-line";

const SUMMARY = "同意を取り消す";
const DETAIL = "元に戻せません";
const CONFIRM = "同意を取り消してデータを削除する";
const RESULTS = {
  withdrawing: Option.none(),
  forbidden: FORBIDDEN,
  signedOut: SIGNED_OUT,
} as const;

const revokeFeedback = mutationFeedback({
  pending: Option.none(),
  failed: "取り消せませんでした",
  result: (status: keyof typeof RESULTS) => RESULTS[status],
});

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
      <div className="mt-3">
        <IconLine icon="warning" tone="muted">
          {DETAIL}
        </IconLine>
      </div>
      <div className="mt-4">
        <PopButton tone="danger" disabled={status === "pending"} onClick={revoke}>
          {CONFIRM}
        </PopButton>
      </div>
      <div className="mt-3">
        <FeedbackLine feedback={revokeFeedback(status, Option.fromUndefinedOr(data))} />
      </div>
    </details>
  );
};

export { RevokePanel };
