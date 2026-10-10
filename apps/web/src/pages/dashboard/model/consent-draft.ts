import { Array, Function, Option } from "effect";
import { Atom } from "effect/reactivity";

import type { GuildSettings } from "#/features/ingest/index.server";

const DATA_FIRST_ARITY = 2;
const NO_CHANNEL = "";

type ConsentDraft =
  | Readonly<{ status: "untouched" }>
  | Readonly<{ status: "edited"; noticeChannelId: string }>;

const UNTOUCHED: ConsentDraft = { status: "untouched" };

const consentDraftAtom = Atom.family((guildId: string) =>
  Atom.make<ConsentDraft>(UNTOUCHED).pipe(Atom.withLabel(`consent-draft:${guildId}`)),
);

const readableChannels = (settings: GuildSettings): GuildSettings["channels"] =>
  settings.channels.filter(({ ingest }) => ingest !== "unreadable");

const noticeChannelOfDataFirst = (settings: GuildSettings, draft: ConsentDraft): string => {
  if (draft.status === "edited") {
    return draft.noticeChannelId;
  }
  return Array.head(readableChannels(settings)).pipe(
    Option.map(({ id }) => id),
    Option.getOrElse(() => NO_CHANNEL),
  );
};

const noticeChannelOf: {
  (draft: ConsentDraft): (settings: GuildSettings) => string;
  (settings: GuildSettings, draft: ConsentDraft): string;
} = Function.dual(DATA_FIRST_ARITY, noticeChannelOfDataFirst);

export { consentDraftAtom, NO_CHANNEL, noticeChannelOf, readableChannels, UNTOUCHED };
export type { ConsentDraft };
