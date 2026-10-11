import type { ReactNode } from "react";

import type { Consent } from "#/features/ingest/index.server";
import { dateFormat } from "#/pages/dashboard/model/date-format";
import { Panel } from "#/shared/ui/panel";

const AWAITING = "同意待ち";
const GRANTED = "同意済み";
const GRANTED_BY = "同意したユーザーの ID";
const GRANTED_AT = "同意した日時";
const WITHDRAWING = "削除中";
const WITHDRAWING_DETAIL =
  "保存したメッセージと検索用データを削除しています。終わると同意待ちに戻ります。";

const ConsentRecord = ({ consent }: Readonly<{ consent: Consent }>): ReactNode => {
  if (consent.status === "awaiting") {
    return (
      <Panel accent="border-l-4 border-l-butter-deep">
        <h2 className="text-dc-bright font-maru text-xl font-black">{AWAITING}</h2>
      </Panel>
    );
  }
  if (consent.status === "withdrawing") {
    return (
      <Panel accent="border-l-4 border-l-pink-deep">
        <h2 className="text-dc-bright font-maru text-xl font-black">{WITHDRAWING}</h2>
        <p>{WITHDRAWING_DETAIL}</p>
      </Panel>
    );
  }
  return (
    <Panel accent="border-l-4 border-l-mint">
      <h2 className="text-dc-bright font-maru text-xl font-black">{GRANTED}</h2>
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
