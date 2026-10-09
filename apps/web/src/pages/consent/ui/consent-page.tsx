import { useMutation, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { clientNameQuery } from "#/pages/consent/api/consent";
import { authClient } from "#/shared/auth";

const ALLOW = "Allow";
const DENY = "Deny";
const FAILED = "Something went wrong. Please try again.";
const SCOPE =
  "will be able to list and read messages in the Discord channels you can read. It cannot post or change anything.";
const ASK = "Allow access for";

const answerConsent = (accept: boolean): Promise<unknown> =>
  authClient.oauth2.consent({ accept, fetchOptions: { throw: true } });

const ConsentPage = (): ReactNode => {
  const { client_id: clientId } = useSearch({ from: "/consent" });
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
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-bold">
        {ASK} {clientName}
      </h1>
      <p>
        {clientName} {SCOPE}
      </p>
      <div className="flex gap-4">
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded px-4 py-2 disabled:opacity-50"
          disabled={status === "pending"}
          onClick={allow}
        >
          {ALLOW}
        </button>
        <button
          type="button"
          className="rounded border px-4 py-2 disabled:opacity-50"
          disabled={status === "pending"}
          onClick={deny}
        >
          {DENY}
        </button>
      </div>
      {status === "error" && <p role="alert">{FAILED}</p>}
    </main>
  );
};

export { ConsentPage };
