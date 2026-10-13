import { env } from "cloudflare:workers";

import type { GuildStore } from "./api/guild-store.server";

const guildStore = (guildId: string): DurableObjectStub<GuildStore> =>
  env.GUILD_STORE.getByName(guildId);

export { guildStore };
export { GuildStore } from "./api/guild-store.server";
export { searchMessages } from "./api/search-messages.server";
export type {
  IndexedMessage,
  PhraseCandidate,
  PhraseNote,
  PhraseState,
  SealedMessage,
  StoredRow,
} from "./api/store-types";
export { labelOf, PHRASE_WINDOW_DAYS, phraseHashes } from "./lib/phrases.server";
export type { Phrase, PhraseKind } from "./lib/phrases.server";
export {
  containsQuery,
  indexTokens,
  queryTokens,
  searchableTexts,
} from "./lib/search-tokens.server";
export { searchSimilar } from "./api/vector-search.server";
