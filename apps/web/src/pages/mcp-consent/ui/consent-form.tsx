import { useMutation, useQuery } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { clientNameQuery } from "#/pages/mcp-consent/api/consent";
import { authClient } from "#/shared/auth";
import { MASCOT_NAME } from "#/shared/config";
import { AppFrame } from "#/shared/ui/app-frame";
import { MascotTip } from "#/shared/ui/mascot-tip";
import { Panel } from "#/shared/ui/panel";

import { ConsentActions } from "./consent-actions";

const TIP = `${MASCOT_NAME}とつなぐよ`;

const answerConsent = (accept: boolean): Promise<unknown> =>
  authClient.oauth2.consent({ accept, fetchOptions: { throw: true } });

const ConsentForm = ({ clientId }: Readonly<{ clientId: string }>): ReactNode => {
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
        <h1 className="text-dc-bright font-maru text-2xl font-black">{clientName}</h1>
        <ConsentActions status={status} onAllow={allow} onDeny={deny} />
      </Panel>
    </AppFrame>
  );
};

export { ConsentForm };
