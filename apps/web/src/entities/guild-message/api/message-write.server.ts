import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";

import { rowChunks } from "./bound-chunks.server.ts";
import type { ExtractedPhrases, IndexedMessage, StoredRow, TrackedRow } from "./store-types.ts";

type Versioned = StoredRow & Readonly<{ tokens: readonly number[]; version: number }>;

export type Writing = Readonly<{
  db: DrizzleSqliteDODatabase;
  items: readonly IndexedMessage[];
  previous: readonly TrackedRow[];
  version: number;
}>;

export const latestPerId = (items: readonly IndexedMessage[]): readonly IndexedMessage[] => {
  const keyed = pipe(
    items,
    Array.map((message): readonly [string, IndexedMessage] => [message.row.id, message]),
  );
  return Array.fromIterable(new Map(keyed).values());
};

const updateOne = (
  db: DrizzleSqliteDODatabase,
  row: Versioned,
  phrases: IndexedMessage["phrases"],
): boolean => {
  const changes = {
    sealed: row.sealed,
    editedAt: row.editedAt,
    describedWith: row.describedWith,
    phrases: phrases.status,
    tokens: row.tokens,
    version: row.version,
    vector: Option.getOrNull(Option.none<Uint8Array>()),
    vectorAt: Option.getOrNull(Option.none<number>()),
  };
  const written = db
    .insert(guildMessage)
    .values({ ...row, phrases: phrases.status })
    .onConflictDoUpdate({ target: guildMessage.id, set: changes })
    .returning({ seq: guildMessage.seq })
    .all();
  return Array.isReadonlyArrayNonEmpty(written);
};

const insertMany = (
  db: DrizzleSqliteDODatabase,
  items: readonly IndexedMessage[],
  version: number,
): ReadonlySet<string> => {
  const rows = pipe(
    items,
    Array.map(({ row, tokens, phrases }) => ({ ...row, tokens, version, phrases: phrases.status })),
  );
  const written = pipe(
    rowChunks(rows),
    Array.flatMap((chunk) =>
      db
        .insert(guildMessage)
        .values([...chunk])
        .onConflictDoNothing()
        .returning({ id: guildMessage.id })
        .all(),
    ),
  );
  return new Set(
    pipe(
      written,
      Array.map(({ id }) => id),
    ),
  );
};

const extractedOf = (message: IndexedMessage, written: boolean): readonly ExtractedPhrases[] => {
  const { row, phrases } = message;
  if (written && phrases.status === "extracted") {
    return [{ message: row, hashes: phrases.hashes }];
  }
  return [];
};

export const writeMessages = ({
  db,
  items,
  previous,
  version,
}: Writing): readonly ExtractedPhrases[] => {
  const existing = new Set(
    pipe(
      previous,
      Array.map(({ id }) => id),
    ),
  );
  const fresh = pipe(
    items,
    Array.filter(({ row }) => !existing.has(row.id)),
  );
  const edited = pipe(
    items,
    Array.filter(({ row }) => existing.has(row.id)),
  );
  const inserted = insertMany(db, fresh, version);
  const inserts = pipe(
    fresh,
    Array.flatMap((message) => extractedOf(message, inserted.has(message.row.id))),
  );
  const updates = pipe(
    edited,
    Array.flatMap((message) =>
      extractedOf(
        message,
        updateOne(db, { ...message.row, tokens: message.tokens, version }, message.phrases),
      ),
    ),
  );
  return [...inserts, ...updates];
};
