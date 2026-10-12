import type { ReactNode } from "react";

import type { Consent } from "#/features/ingest/index.server";
import { dateFormat } from "#/pages/dashboard/model/format";
import { Panel } from "#/shared/ui/panel";

const GRANTED = "同意済み";
const GRANTED_AT = "同意した日時";
const WITHDRAWING = "削除中";

const ConsentRecord = ({
  consent,
}: Readonly<{ consent: Exclude<Consent, Readonly<{ status: "awaiting" }>> }>): ReactNode => {
  if (consent.status === "withdrawing") {
    return (
      <Panel accent="border-l-4 border-l-pink-deep">
        <h2 className="text-dc-bright font-maru text-xl font-black">{WITHDRAWING}</h2>
      </Panel>
    );
  }
  return (
    <Panel accent="border-l-4 border-l-mint">
      <h2 className="text-dc-bright font-maru text-xl font-black">{GRANTED}</h2>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="font-bold">{GRANTED_AT}</dt>
        <dd>{dateFormat.format(consent.grantedAt)}</dd>
      </dl>
    </Panel>
  );
};

export { ConsentRecord };
