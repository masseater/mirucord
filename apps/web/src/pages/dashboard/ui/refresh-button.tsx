import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { useReturnToDashboard } from "#/pages/dashboard/model/use-return-to-dashboard";
import { PopButton } from "#/shared/ui/pop-button";

const REFRESH = "一覧を更新";

const RefreshButton = (): ReactNode => {
  const returnToDashboard = useReturnToDashboard();
  const { mutate, status } = useMutation({ mutationFn: () => returnToDashboard("stay") });
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <PopButton tone="secondary" size="sm" disabled={status === "pending"} onClick={refresh}>
      {REFRESH}
    </PopButton>
  );
};

export { RefreshButton };
