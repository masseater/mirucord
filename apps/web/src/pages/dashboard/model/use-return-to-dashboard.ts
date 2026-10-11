import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Effect } from "effect";
import { useCallback } from "react";

import { dashboardQuery } from "#/pages/dashboard/api/dashboard";
import { DASHBOARD_PATH } from "#/shared/config";

type Departure = "stay" | "leave";

const useReturnToDashboard = (): ((departure: Departure) => Promise<void>) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(
    (departure: Departure) => {
      const refresh = Effect.promise(() =>
        queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
      );
      const leave = Effect.promise(() => navigate({ to: DASHBOARD_PATH }));
      const after = { stay: refresh, leave: refresh.pipe(Effect.andThen(leave)) } as const;
      return Effect.runPromise(after[departure]);
    },
    [navigate, queryClient],
  );
};

export { useReturnToDashboard };
