import { Array, Boolean, Function, Option } from "effect";
import { Atom } from "effect/reactivity";

import type { GuildSettings } from "#/features/ingest/index.server";

const DATA_FIRST_ARITY = 2;
const NO_CHANNEL = "";

type ConsentSelection = Readonly<{ channelIds: readonly string[]; noticeChannelId: string }>;

type ConsentDraft =
  | Readonly<{ status: "untouched" }>
  | (Readonly<{ status: "edited" }> & ConsentSelection);

const UNTOUCHED: ConsentDraft = { status: "untouched" };

const consentDraftAtom = Atom.family((guildId: string) =>
  Atom.make<ConsentDraft>(UNTOUCHED).pipe(Atom.withLabel(`consent-draft:${guildId}`)),
);

const initialSelection = (settings: GuildSettings): ConsentSelection => {
  if (settings.consent.status === "granted") {
    return settings.consent;
  }
  return {
    channelIds: settings.channels.map(({ id }) => id),
    noticeChannelId: Option.getOrElse(
      Option.map(Array.head(settings.channels), ({ id }) => id),
      () => NO_CHANNEL,
    ),
  };
};

const selectionOf: {
  (draft: ConsentDraft): (settings: GuildSettings) => ConsentSelection;
  (settings: GuildSettings, draft: ConsentDraft): ConsentSelection;
} = Function.dual(DATA_FIRST_ARITY, (settings: GuildSettings, draft: ConsentDraft) => {
  if (draft.status === "edited") {
    return draft;
  }
  return initialSelection(settings);
});

const toggleChannel: {
  (channelId: string): (selection: ConsentSelection) => ConsentDraft;
  (selection: ConsentSelection, channelId: string): ConsentDraft;
} = Function.dual(
  DATA_FIRST_ARITY,
  (selection: ConsentSelection, channelId: string): ConsentDraft => ({
    status: "edited",
    noticeChannelId: selection.noticeChannelId,
    channelIds: Boolean.match(selection.channelIds.includes(channelId), {
      onTrue: () => selection.channelIds.filter((id) => id !== channelId),
      onFalse: () => [...selection.channelIds, channelId],
    }),
  }),
);

const chooseNotice: {
  (noticeChannelId: string): (selection: ConsentSelection) => ConsentDraft;
  (selection: ConsentSelection, noticeChannelId: string): ConsentDraft;
} = Function.dual(
  DATA_FIRST_ARITY,
  (selection: ConsentSelection, noticeChannelId: string): ConsentDraft => ({
    status: "edited",
    channelIds: selection.channelIds,
    noticeChannelId,
  }),
);

export { chooseNotice, consentDraftAtom, selectionOf, toggleChannel, UNTOUCHED };
export type { ConsentDraft, ConsentSelection };
