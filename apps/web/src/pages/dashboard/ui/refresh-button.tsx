import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { refreshQuery } from "#/pages/dashboard/api/dashboard";
import type { RefreshTarget } from "#/pages/dashboard/api/dashboard";
import { refreshLabel, refreshNote } from "#/pages/dashboard/model/refresh-note";
import { PopButton } from "#/shared/ui/pop-button";

const RefreshButton = ({ target }: Readonly<{ target: RefreshTarget }>): ReactNode => {
  const options = refreshQuery(target);
  const state = useQuery(options);
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: () => queryClient.refetchQueries({ queryKey: options.queryKey }),
  });
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PopButton
        tone="milk"
        size="sm"
        disabled={state.fetchStatus === "fetching"}
        onClick={refresh}
      >
        {refreshLabel(state)}
      </PopButton>
      <span aria-live="polite" className="text-ink-soft text-sm font-bold">
        {refreshNote(state)}
      </span>
    </div>
  );
};

export { RefreshButton };
