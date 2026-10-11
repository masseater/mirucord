import { Option } from "effect";
import type { ReactNode } from "react";

import type { ConsentResult } from "#/features/ingest/index.server";
import { MASCOT_NAME } from "#/shared/config";

type MutationStatus = "idle" | "pending" | "success" | "error";

const MESSAGES = {
  saved: "取り込みを始めました。",
  forbidden: "このサーバーを管理する権限が確認できませんでした。",
  invalid: `お知らせを投稿するチャンネルを${MASCOT_NAME}が見られるチャンネルから選んでください。`,
  noticeForbidden: `${MASCOT_NAME}がこのチャンネルにメッセージを送る権限がないので、同意はまだ記録していません。Discord のチャンネル設定で${MASCOT_NAME}に「メッセージを送信」を許可するか、別のチャンネルを選んでください。`,
  noticeFailed:
    "Discord にお知らせを投稿できなかったので、同意はまだ記録していません。少し待ってからもう一度押してください。",
  signedOut: "ログインの期限が切れました。",
} as const;
const FAILED = "保存できませんでした。";
const PENDING = "取り込みを始めています。";
const SILENT = "";

const messageOf = (
  status: MutationStatus,
  result: Option.Option<ConsentResult | Readonly<{ status: "signedOut" }>>,
): string => {
  if (status === "error") {
    return FAILED;
  }
  if (status === "pending") {
    return PENDING;
  }
  return result.pipe(
    Option.filter(() => status === "success"),
    Option.map((answered) => MESSAGES[answered.status]),
    Option.getOrElse(() => SILENT),
  );
};

const ConsentResultMessage = ({
  status,
  result,
}: Readonly<{
  status: MutationStatus;
  result: Option.Option<ConsentResult | Readonly<{ status: "signedOut" }>>;
}>): ReactNode => <output>{messageOf(status, result)}</output>;

export { ConsentResultMessage };
