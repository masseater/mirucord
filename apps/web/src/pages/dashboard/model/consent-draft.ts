import { Array, Function, Option } from "effect";

import type { GuildSettings } from "#/features/ingest/index.server";

const DATA_FIRST_ARITY = 2;
const NO_CHANNEL = "";

type ConsentDraft =
  | Readonly<{ status: "untouched" }>
  | Readonly<{ status: "edited"; noticeChannelId: string }>;

const UNTOUCHED: ConsentDraft = { status: "untouched" };

const readableChannels = (settings: GuildSettings): GuildSettings["channels"] =>
  settings.channels.filter(({ ingest }) => ingest !== "unreadable");

const noticeChannels = (settings: GuildSettings): GuildSettings["channels"] =>
  readableChannels(settings).filter(({ kind }) => kind === "text");

const noticeChannelOfDataFirst = (settings: GuildSettings, draft: ConsentDraft): string => {
  if (draft.status === "edited") {
    return draft.noticeChannelId;
  }
  return Array.head(noticeChannels(settings)).pipe(
    Option.map(({ id }) => id),
    Option.getOrElse(() => NO_CHANNEL),
  );
};

const noticeChannelOf: {
  (draft: ConsentDraft): (settings: GuildSettings) => string;
  (settings: GuildSettings, draft: ConsentDraft): string;
} = Function.dual(DATA_FIRST_ARITY, noticeChannelOfDataFirst);

export { NO_CHANNEL, noticeChannelOf, noticeChannels, readableChannels, UNTOUCHED };
export type { ConsentDraft };
