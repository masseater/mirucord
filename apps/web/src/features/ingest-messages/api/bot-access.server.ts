import { DateTime, Option } from "effect";

import type { BotAccess } from "#/features/ingest-messages/model/bot-access";

export type AccessColumns = Readonly<{ botAccess: BotAccess["status"]; hiddenAt: number | null }>;

export const accessOf = ({ botAccess, hiddenAt }: AccessColumns): BotAccess =>
  Option.match(
    Option.filter(Option.fromNullOr(hiddenAt), () => botAccess === "hidden"),
    {
      onNone: (): BotAccess => ({ status: "readable" }),
      onSome: (since): BotAccess => ({ status: "hidden", since: DateTime.makeUnsafe(since) }),
    },
  );

export const columnsOf = (access: BotAccess): AccessColumns => {
  if (access.status === "hidden") {
    return { botAccess: "hidden", hiddenAt: DateTime.toEpochMillis(access.since) };
  }
  return { botAccess: "readable", hiddenAt: Option.getOrNull(Option.none<number>()) };
};
