import { useAtom } from "@effect/atom-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback } from "react";

import type { ConsentResult, GuildSettings } from "#/features/ingest/index.server";
import { dashboardQuery, saveConsent } from "#/pages/dashboard/api/dashboard";
import type { ConsentInput } from "#/pages/dashboard/api/dashboard.server";

import { consentDraftAtom, NO_CHANNEL, noticeChannelOf, UNTOUCHED } from "./consent-draft";

type ConsentForm = Readonly<{
  noticeChannelId: string;
  canSubmit: boolean;
  pickNotice: (channelId: string) => void;
  submit: () => void;
  mutation: UseMutationResult<
    ConsentResult | Readonly<{ status: "signedOut" }>,
    Error,
    ConsentInput
  >;
}>;

const useConsentForm = (settings: GuildSettings): ConsentForm => {
  const [draft, setDraft] = useAtom(consentDraftAtom(settings.id));
  const noticeChannelId = noticeChannelOf(settings, draft);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: saveConsent,
    onSuccess: (result) => {
      if (result.status === "saved") {
        setDraft(UNTOUCHED);
      }
      return queryClient.invalidateQueries({ queryKey: dashboardQuery.queryKey });
    },
  });
  const { mutate } = mutation;
  const pickNotice = useCallback(
    (channelId: string) => {
      setDraft({ status: "edited", noticeChannelId: channelId });
    },
    [setDraft],
  );
  const submit = useCallback(() => {
    mutate({ guildId: settings.id, noticeChannelId });
  }, [mutate, noticeChannelId, settings.id]);
  return {
    noticeChannelId,
    canSubmit: mutation.status !== "pending" && noticeChannelId !== NO_CHANNEL,
    pickNotice,
    submit,
    mutation,
  };
};

export { useConsentForm };
