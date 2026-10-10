import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { clientNameQuery } from "#/pages/mcp-consent/api/consent";
import { authClient } from "#/shared/auth";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

import { ConsentActions } from "./consent-actions";

const TIP = "ミルとつなぐよ";
const FAILED = "うまくいきませんでした。";
const SCOPE = "は、あなたが Discord で読めるチャンネルのメッセージを読めるようになります。";
const ASK = "へのアクセスを許可しますか";

const answerConsent = (accept: boolean): Promise<unknown> =>
  authClient.oauth2.consent({ accept, fetchOptions: { throw: true } });

const ConsentPage = (): ReactNode => {
  const { client_id: clientId } = useSearch({ from: "/mcp_/consent" });
  const client = useQuery(clientNameQuery(clientId));
  const clientName = Option.getOrElse(Option.fromUndefinedOr(client.data), () => clientId);
  const { mutate, status } = useMutation({ mutationFn: answerConsent });
  const allow = useCallback(() => {
    mutate(true);
  }, [mutate]);
  const deny = useCallback(() => {
    mutate(false);
  }, [mutate]);
  return (
    <AppFrame>
      <MascotTip>{TIP}</MascotTip>
      <Panel>
        <h1 className="text-2xl font-black">
          {clientName}
          {ASK}
        </h1>
        <p className="text-ink-soft leading-relaxed">
          {clientName}
          {SCOPE}
        </p>
        <ConsentActions pending={status === "pending"} onAllow={allow} onDeny={deny} />
        {status === "error" && <p role="alert">{FAILED}</p>}
      </Panel>
    </AppFrame>
  );
};

export { ConsentPage };
