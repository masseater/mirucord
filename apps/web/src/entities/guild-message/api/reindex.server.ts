import { and, eq, isNull } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Option } from "effect";

import { SEQUENTIAL } from "#/entities/guild-message/lib/search-layout";
import { indexTokens, searchableTexts } from "#/entities/guild-message/lib/search-tokens.server";
import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { openGuildKeys, openMessage } from "#/shared/crypto/index.server";

import { searchLedger } from "./search-ledger.server";
import { wrappedKeyOf } from "./wrapped-key.server";

const REINDEX_BATCH = 500;

type Reindexing = Readonly<{ store: DrizzleSqliteDODatabase; guildId: string }>;

type MissingRow = Readonly<{ id: string; channelId: string; sealed: string }>;

type Reindexed = Readonly<{ id: string; tokens: readonly number[] }>;

const missingRows = (store: DrizzleSqliteDODatabase): readonly MissingRow[] =>
  store
    .select({ id: guildMessage.id, channelId: guildMessage.channelId, sealed: guildMessage.sealed })
    .from(guildMessage)
    .where(isNull(guildMessage.tokens))
    .limit(REINDEX_BATCH)
    .all();

const tokensOf = (
  { guildId }: Reindexing,
  wrappedKey: string,
  rows: readonly MissingRow[],
): Effect.Effect<readonly Reindexed[]> =>
  openGuildKeys(wrappedKey).pipe(
    Effect.flatMap(({ key, searchKey }) =>
      Effect.forEach(
        rows,
        ({ id, channelId, sealed }) =>
          openMessage(sealed, key, { guildId, channelId, messageId: id }).pipe(
            Effect.flatMap((body) => indexTokens({ key: searchKey, texts: searchableTexts(body) })),
            Effect.map((tokens) => ({ id, tokens })),
          ),
        { concurrency: SEQUENTIAL },
      ),
    ),
  );

const storeTokens = (store: DrizzleSqliteDODatabase, indexed: readonly Reindexed[]): void => {
  const version = searchLedger(store).nextVersion();
  for (const { id, tokens } of indexed) {
    store
      .update(guildMessage)
      .set({ tokens, version })
      .where(and(eq(guildMessage.id, id), isNull(guildMessage.tokens)))
      .run();
  }
};

const reindexMissing = (reindexing: Reindexing): Effect.Effect<boolean> => {
  const { store, guildId } = reindexing;
  const rows = missingRows(store);
  if (Array.isReadonlyArrayEmpty(rows)) {
    return Effect.succeed(false);
  }
  return wrappedKeyOf(guildId).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed(false),
        onSome: (wrappedKey) =>
          tokensOf(reindexing, wrappedKey, rows).pipe(
            Effect.map((indexed) => {
              storeTokens(store, indexed);
              return rows.length === REINDEX_BATCH;
            }),
          ),
      }),
    ),
    Effect.withSpan("search.reindexMissing", { attributes: { guildId, rows: rows.length } }),
  );
};

export { reindexMissing };
export type { Reindexing };
