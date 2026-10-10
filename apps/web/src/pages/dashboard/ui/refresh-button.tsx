import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { refreshQuery } from "#/pages/dashboard/api/dashboard";
import type { RefreshTarget } from "#/pages/dashboard/api/dashboard";
import { PopButton } from "#/shared/ui/pop-button";

import { refreshLabel, refreshNote, refreshViewOf } from "./refresh-note";

const RefreshButton = ({ target }: Readonly<{ target: RefreshTarget }>): ReactNode => {
  const options = refreshQuery(target);
  const view = refreshViewOf(useQuery(options));
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: () => queryClient.refetchQueries({ queryKey: options.queryKey }),
  });
  const refresh = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PopButton tone="milk" size="sm" disabled={view.status === "looking"} onClick={refresh}>
        {refreshLabel(view)}
      </PopButton>
      <span aria-live="polite" className="text-ink-soft text-sm font-bold">
        {refreshNote(view)}
      </span>
    </div>
  );
};

export { RefreshButton };
