import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { dashboardQuery, disconnectConnectedApp } from "#/pages/dashboard/api/dashboard";
import type { ConnectedApp } from "#/shared/auth/index.server";
import { PopButton } from "#/shared/ui/pop-button";

const DISCONNECT = "解除";
const FAILED = "解除できませんでした";

const ConnectedAppRow = ({ app }: Readonly<{ app: ConnectedApp }>): ReactNode => {
  const queryClient = useQueryClient();
  const { mutate, status } = useMutation({
    mutationFn: disconnectConnectedApp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
  });
  const disconnect = useCallback(() => {
    mutate(app.clientId);
  }, [app.clientId, mutate]);
  return (
    <li className="border-ink flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3">
      <span className="grow font-bold">{app.name}</span>
      {status === "error" && (
        <span role="alert" className="text-xs font-bold">
          {FAILED}
        </span>
      )}
      <PopButton tone="pink" size="sm" disabled={status === "pending"} onClick={disconnect}>
        {DISCONNECT}
        <span className="sr-only">{`（${app.name}）`}</span>
      </PopButton>
    </li>
  );
};

export { ConnectedAppRow };
