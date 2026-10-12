import { Option } from "effect";
import type { ReactNode } from "react";

import type { ConsentResult } from "#/features/ingest/index.server";
import {
  failure,
  fixable,
  FORBIDDEN,
  mutationFeedback,
  SIGNED_OUT,
} from "#/pages/dashboard/lib/feedback";
import type { Feedback } from "#/pages/dashboard/lib/feedback";
import { MASCOT_NAME } from "#/shared/config";

import { FeedbackLine } from "./feedback-line";

type Answer = ConsentResult | Readonly<{ status: "signedOut" }>;

const RESULTS: Readonly<Record<Answer["status"], Option.Option<Feedback>>> = {
  saved: Option.none(),
  forbidden: FORBIDDEN,
  invalid: fixable("refresh")("このチャンネルには投稿できません"),
  withdrawing: failure("削除が終わるまで同意できません"),
  noticeForbidden: failure(`${MASCOT_NAME}はこのチャンネルに投稿できません`),
  noticeMissing: fixable("refresh")("このチャンネルは見つかりません"),
  noticeFailed: failure("お知らせを投稿できませんでした"),
  signedOut: SIGNED_OUT,
};

const consentFeedback = mutationFeedback({
  pending: Option.none(),
  failed: "保存できませんでした",
  result: (status: Answer["status"]) => RESULTS[status],
});

const ConsentResultMessage = ({
  status,
  result,
}: Readonly<{
  status: "idle" | "pending" | "success" | "error";
  result: Option.Option<Answer>;
}>): ReactNode => <FeedbackLine feedback={consentFeedback(status, result)} />;

export { ConsentResultMessage };
