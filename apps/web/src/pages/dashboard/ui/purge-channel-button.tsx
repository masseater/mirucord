import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { dashboardQuery, purgeStoredChannel } from "#/pages/dashboard/api/dashboard";
import { PopButton } from "#/shared/ui/pop-button";

const LABEL = "今すぐ削除";
const FAILED = "削除できませんでした";

const PurgeChannelButton = ({
  guildId,
  channelId,
  channelName,
}: Readonly<{ guildId: string; channelId: string; channelName: string }>): ReactNode => {
  const queryClient = useQueryClient();
  const { mutate, status } = useMutation({
    mutationFn: purgeStoredChannel,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey }),
  });
  const purge = useCallback(() => {
    mutate({ guildId, channelId });
  }, [channelId, guildId, mutate]);
  return (
    <>
      <PopButton tone="pink" size="sm" disabled={status === "pending"} onClick={purge}>
        {LABEL}
        <span className="sr-only">{`（#${channelName}）`}</span>
      </PopButton>
      {status === "error" && (
        <span role="alert" className="text-xs font-bold">
          {FAILED}
        </span>
      )}
    </>
  );
};

export { PurgeChannelButton };
