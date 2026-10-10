import type { ReactNode } from "react";

import type { Consent } from "#/features/ingest/index.server";

const AWAITING =
  "まだ同意されていないので、このサーバーのメッセージは読み取っていません。下の説明を読んで、読み取ってよいチャンネルを選んでください。";
const GRANTED_BY = "同意したユーザーの ID";
const GRANTED_AT = "同意した日時";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

const ConsentRecord = ({ consent }: Readonly<{ consent: Consent }>): ReactNode => {
  if (consent.status === "awaiting") {
    return <p className="rounded border px-4 py-3">{AWAITING}</p>;
  }
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded border px-4 py-3">
      <dt>{GRANTED_AT}</dt>
      <dd>{dateFormat.format(consent.grantedAt)}</dd>
      <dt>{GRANTED_BY}</dt>
      <dd className="font-mono">{consent.grantedBy}</dd>
    </dl>
  );
};

export { ConsentRecord };
