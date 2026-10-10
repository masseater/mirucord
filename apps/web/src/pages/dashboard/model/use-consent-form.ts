import { useAtom } from "@effect/atom-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { Array } from "effect";
import { useCallback } from "react";

import type { ConsentResult, GuildSettings } from "#/features/ingest/index.server";
import { dashboardQuery, saveConsent } from "#/pages/dashboard/api/dashboard";
import type { ConsentInput } from "#/pages/dashboard/api/dashboard.server";

import {
  chooseNotice,
  consentDraftAtom,
  selectionOf,
  toggleChannel,
  UNTOUCHED,
} from "./consent-draft";
import type { ConsentSelection } from "./consent-draft";

type ConsentForm = Readonly<{
  selection: ConsentSelection;
  canSubmit: boolean;
  toggle: (channelId: string) => void;
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
  const selection = selectionOf(settings, draft);
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
  const toggle = useCallback(
    (channelId: string) => {
      setDraft(toggleChannel(selection, channelId));
    },
    [selection, setDraft],
  );
  const pickNotice = useCallback(
    (channelId: string) => {
      setDraft(chooseNotice(selection, channelId));
    },
    [selection, setDraft],
  );
  const submit = useCallback(() => {
    mutate({ guildId: settings.id, ...selection });
  }, [mutate, selection, settings.id]);
  return {
    selection,
    canSubmit: mutation.status !== "pending" && Array.isReadonlyArrayNonEmpty(selection.channelIds),
    toggle,
    pickNotice,
    submit,
    mutation,
  };
};

export { useConsentForm };
