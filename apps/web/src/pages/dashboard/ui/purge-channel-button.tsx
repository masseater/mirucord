import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { dashboardQuery, purgeStoredChannel } from "#/pages/dashboard/api/dashboard";

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
      <button
        type="button"
        aria-label={`${LABEL}（#${channelName}）`}
        className="border-ink bg-milk rounded-full border-2 px-3 py-0.5 text-xs font-bold disabled:opacity-50"
        disabled={status === "pending"}
        onClick={purge}
      >
        {LABEL}
      </button>
      {status === "error" && (
        <span role="alert" className="text-xs font-bold">
          {FAILED}
        </span>
      )}
    </>
  );
};

export { PurgeChannelButton };
