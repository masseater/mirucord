import { useAtom } from "@effect/atom-react";
import { useMutation } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

import type { ConsentResult, GuildSettings } from "#/features/ingest/index.server";
import { saveConsent } from "#/pages/dashboard/api/dashboard";
import type { ConsentInput } from "#/pages/dashboard/api/dashboard.server";

import { NO_CHANNEL, noticeChannelOf, UNTOUCHED } from "./consent-draft";
import type { ConsentDraft } from "./consent-draft";
import { useReturnToDashboard } from "./use-return-to-dashboard";

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

const consentDraftAtom = Atom.family((guildId: string) =>
  Atom.make<ConsentDraft>(UNTOUCHED).pipe(Atom.withLabel(`consent-draft:${guildId}`)),
);

const useConsentForm = (settings: GuildSettings): ConsentForm => {
  const [draft, setDraft] = useAtom(consentDraftAtom(settings.id));
  const noticeChannelId = noticeChannelOf(settings, draft);
  const returnToDashboard = useReturnToDashboard();
  const mutation = useMutation({
    mutationFn: saveConsent,
    onSuccess: (result) => {
      if (result.status !== "saved") {
        return returnToDashboard("stay");
      }
      setDraft(UNTOUCHED);
      return returnToDashboard("leave");
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
