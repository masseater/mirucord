import { useQuery } from "@tanstack/react-query";
import { Option } from "effect";
import type { ReactNode } from "react";

import { linkedAccountsQuery } from "#/pages/dashboard/api/linked-accounts";
import { SERVICE_NAME } from "#/shared/config";
import { IconLine } from "#/shared/ui/icon-line";
import { Panel } from "#/shared/ui/panel";

import { LinkedAccountState } from "./linked-account-state";

const TITLE = "連携アカウントの公開";
const INTRO = `Discord のプロフィールで全員に公開している連携アカウントから選んだものを、${SERVICE_NAME} のどのサーバーでも見せます。読み込みに使った Discord の許可は、選び終えたら手放します。`;

const LinkedAccountPanel = (): ReactNode => {
  const { status, data } = useQuery(linkedAccountsQuery);
  return (
    <Panel>
      <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
      <IconLine icon="visible" tone="muted" size="sm">
        {INTRO}
      </IconLine>
      <LinkedAccountState status={status} data={Option.fromUndefinedOr(data)} />
    </Panel>
  );
};

export { LinkedAccountPanel };
