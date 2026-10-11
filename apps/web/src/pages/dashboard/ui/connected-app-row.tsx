import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { disconnectConnectedApp } from "#/pages/dashboard/api/dashboard";
import { useReturnToDashboard } from "#/pages/dashboard/model/use-return-to-dashboard";
import type { ConnectedApp } from "#/shared/auth/index.server";
import { PopButton } from "#/shared/ui/pop-button";

import { ConnectedAppDates } from "./connected-app-dates";

const DISCONNECT = "解除";
const FAILED = "解除できませんでした";

const ConnectedAppRow = ({ app }: Readonly<{ app: ConnectedApp }>): ReactNode => {
  const returnToDashboard = useReturnToDashboard();
  const { mutate, status } = useMutation({
    mutationFn: disconnectConnectedApp,
    onSuccess: () => returnToDashboard("stay"),
  });
  const disconnect = useCallback(() => {
    mutate(app.clientId);
  }, [app.clientId, mutate]);
  return (
    <li className="border-dc-line flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
      <span className="grow font-bold">{app.name}</span>
      {status === "error" && (
        <span role="alert" className="text-xs font-bold">
          {FAILED}
        </span>
      )}
      <PopButton tone="danger" size="sm" disabled={status === "pending"} onClick={disconnect}>
        {DISCONNECT}
        <span className="sr-only">{`（${app.name}）`}</span>
      </PopButton>
      <ConnectedAppDates app={app} />
    </li>
  );
};

export { ConnectedAppRow };
