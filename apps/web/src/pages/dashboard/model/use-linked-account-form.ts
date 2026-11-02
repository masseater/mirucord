import { useAtom } from "@effect/atom-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult } from "@tanstack/react-query";
import { Atom } from "effect/reactivity";
import { useCallback } from "react";

import type { SignedOut } from "#/pages/dashboard/api/dashboard.server";
import type {
  ConnectionKey,
  LinkedChoice,
  PublishResult,
} from "#/pages/dashboard/api/linked-account-store.server";
import {
  discardLinkedAccountsDraft,
  linkedAccountsQuery,
  publishLinkedAccounts,
} from "#/pages/dashboard/api/linked-accounts";
import type { DoneResult } from "#/pages/dashboard/api/linked-accounts.server";

import {
  chosenConnections,
  connectionKeyOf,
  selectedKeysOf,
  toggledKeys,
  UNTOUCHED_LINKS,
} from "./linked-account-draft";
import type { LinkedDraft } from "./linked-account-draft";

type LinkedAccountForm = Readonly<{
  selected: readonly string[];
  toggle: (choice: LinkedChoice) => void;
  publish: () => void;
  discard: () => void;
  publishing: UseMutationResult<PublishResult | SignedOut, Error, void>;
  discarding: UseMutationResult<DoneResult, Error, void>;
}>;

const linkedDraftAtom = Atom.make<LinkedDraft>(UNTOUCHED_LINKS).pipe(
  Atom.withLabel("linked-account-draft"),
);

const useInvalidateLinkedAccounts = (): (() => Promise<void>) => {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: linkedAccountsQuery.queryKey }),
    [queryClient],
  );
};

const useRefreshLinkedAccounts = (reset: () => void): (() => Promise<void>) => {
  const invalidate = useInvalidateLinkedAccounts();
  return useCallback(() => {
    reset();
    return invalidate();
  }, [invalidate, reset]);
};

type LinkedMutations = Pick<LinkedAccountForm, "publish" | "discard" | "publishing" | "discarding">;

const useLinkedMutations = (
  connections: readonly ConnectionKey[],
  reset: () => void,
): LinkedMutations => {
  const refresh = useRefreshLinkedAccounts(reset);
  const publishing = useMutation({
    mutationFn: () => publishLinkedAccounts(connections),
    onSuccess: refresh,
  });
  const discarding = useMutation({ mutationFn: discardLinkedAccountsDraft, onSuccess: refresh });
  const { mutate: publishMutate } = publishing;
  const { mutate: discardMutate } = discarding;
  const publish = useCallback(() => {
    publishMutate();
  }, [publishMutate]);
  const discard = useCallback(() => {
    discardMutate();
  }, [discardMutate]);
  return { publish, discard, publishing, discarding };
};

const useLinkedAccountForm = (choices: readonly LinkedChoice[]): LinkedAccountForm => {
  const [draft, setDraft] = useAtom(linkedDraftAtom);
  const selected = selectedKeysOf(choices)(draft);
  const reset = useCallback(() => {
    setDraft(UNTOUCHED_LINKS);
  }, [setDraft]);
  const mutations = useLinkedMutations(chosenConnections(choices)(selected), reset);
  const toggle = useCallback(
    (choice: LinkedChoice) => {
      setDraft({ status: "edited", selected: toggledKeys(selected)(connectionKeyOf(choice)) });
    },
    [selected, setDraft],
  );
  return { selected, toggle, ...mutations };
};

export { useInvalidateLinkedAccounts, useLinkedAccountForm };
export type { LinkedAccountForm };
