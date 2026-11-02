import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { linkedAccountsQuery } from "#/pages/dashboard/api/linked-accounts";
import { fixable, progress } from "#/pages/dashboard/lib/feedback";
import { IconLine } from "#/shared/ui/icon-line";
import { Panel } from "#/shared/ui/panel";

import { FeedbackLine } from "./feedback-line";
import { LinkedAccountBody } from "./linked-account-body";

const TITLE = "連携アカウントの公開";
const INTRO =
  "Discord のプロフィールで全員に公開している連携アカウントから選んだものを、mirucord のどのサーバーでも見せます。読み込みに使った Discord の許可は、選び終えたら手放します。";
const LOADING = progress("読み込んでいます");
const UNAVAILABLE = fixable("refresh")("連携アカウントを読み込めませんでした");

const LinkedAccountPanel = (): ReactNode => {
  const { data, status } = useQuery(linkedAccountsQuery);
  return (
    <Panel>
      <h2 className="text-dc-bright font-maru text-xl font-black">{TITLE}</h2>
      <IconLine icon="visible" tone="muted" size="sm">
        {INTRO}
      </IconLine>
      {status === "pending" && <FeedbackLine feedback={LOADING} />}
      {status === "error" && <FeedbackLine feedback={UNAVAILABLE} />}
      {status === "success" && data.status !== "signedOut" && <LinkedAccountBody linked={data} />}
    </Panel>
  );
};

export { LinkedAccountPanel };
