import { inArray } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, pipe } from "effect";

import { BOUND_LIMIT } from "#/entities/guild-message/model/guild-message.schema";
import { phraseUse } from "#/entities/guild-message/model/phrase-use.schema";

import { rowChunks } from "./bound-chunks.server.ts";
import type { ExtractedPhrases } from "./store-types.ts";

const rowsOf = ({
  message,
  hashes,
}: ExtractedPhrases): readonly (typeof phraseUse.$inferInsert)[] =>
  pipe(
    hashes,
    Array.map(({ phrase, common }) => ({
      messageId: message.id,
      phrase,
      common,
      channelId: message.channelId,
      authorId: message.authorId,
      createdAt: message.createdAt,
    })),
  );

const record = (db: DrizzleSqliteDODatabase, written: readonly ExtractedPhrases[]): void => {
  const latest = pipe(
    written,
    Array.reverse,
    Array.dedupeWith((left, right) => left.message.id === right.message.id),
  );
  const messageIds = pipe(
    latest,
    Array.map(({ message }) => message.id),
  );
  for (const chunk of Array.chunksOf(messageIds, BOUND_LIMIT)) {
    db.delete(phraseUse)
      .where(inArray(phraseUse.messageId, [...chunk]))
      .run();
  }
  const rows = pipe(latest, Array.flatMap(rowsOf));
  for (const chunk of rowChunks(rows)) {
    db.insert(phraseUse)
      .values([...chunk])
      .onConflictDoNothing()
      .run();
  }
};

export type PhraseUseLedger = Readonly<{
  record: (written: readonly ExtractedPhrases[]) => void;
}>;

export const phraseUseLedger = (db: DrizzleSqliteDODatabase): PhraseUseLedger => ({
  record: (written) => {
    record(db, written);
  },
});
