import type { ReactNode } from "react";

import type { Consent } from "#/features/ingest/index.server";
import { Panel } from "#/shared/ui/panel";

const AWAITING = "同意待ち";
const AWAITING_DETAIL = "同意してもらうまで、このサーバーのメッセージは読み取りません。";
const GRANTED = "同意済み";
const GRANTED_BY = "同意したユーザーの ID";
const GRANTED_AT = "同意した日時";

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

const ConsentRecord = ({ consent }: Readonly<{ consent: Consent }>): ReactNode => {
  if (consent.status === "awaiting") {
    return (
      <Panel tone="bg-butter">
        <h2 className="text-xl font-black">{AWAITING}</h2>
        <p>{AWAITING_DETAIL}</p>
      </Panel>
    );
  }
  return (
    <Panel tone="bg-mint">
      <h2 className="text-xl font-black">{GRANTED}</h2>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="font-bold">{GRANTED_AT}</dt>
        <dd>{dateFormat.format(consent.grantedAt)}</dd>
        <dt className="font-bold">{GRANTED_BY}</dt>
        <dd className="font-mono">{consent.grantedBy}</dd>
      </dl>
    </Panel>
  );
};

export { ConsentRecord };
