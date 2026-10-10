import { Option } from "effect";
import type { ReactNode } from "react";

import type { ConsentResult } from "#/features/ingest/index.server";

type MutationStatus = "idle" | "pending" | "success" | "error";

const MESSAGES = {
  saved: "取り込みを始めました。",
  forbidden: "このサーバーを管理する権限が確認できませんでした。",
  invalid: "お知らせを投稿するチャンネルをミルが見られるチャンネルから選んでください。",
  noticeFailed: "お知らせを投稿できなかったので、同意はまだ記録していません。",
  signedOut: "ログインの期限が切れました。",
} as const;
const FAILED = "保存できませんでした。";
const SILENT = "";

const messageOf = (
  status: MutationStatus,
  result: Option.Option<ConsentResult | Readonly<{ status: "signedOut" }>>,
): string => {
  if (status === "error") {
    return FAILED;
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
