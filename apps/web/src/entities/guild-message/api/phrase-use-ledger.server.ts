import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, pipe } from "effect";

import { phraseUse } from "#/entities/guild-message/model/phrase-use.schema";

import { deleteIn, rowChunks } from "./bound-chunks.server.ts";
import type { ExtractedPhrases, PhraseColumn } from "./store-types.ts";

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
  deleteIn({ db, table: phraseUse, column: phraseUse.messageId, values: messageIds });
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
  forget: (column: PhraseColumn, values: readonly string[]) => void;
}>;

export const phraseUseLedger = (db: DrizzleSqliteDODatabase): PhraseUseLedger => ({
  record: (written) => {
    record(db, written);
  },
  forget: (column, values) => {
    deleteIn({ db, table: phraseUse, column: phraseUse[column], values });
  },
});
