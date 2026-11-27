import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, pipe } from "effect";

import { erasedAuthor } from "#/entities/guild-message/model/erased-author.schema";

import { rowChunks } from "./bound-chunks.server";

export type ErasedAuthor = Readonly<{ id: string }>;

export type ErasedAuthors = Readonly<{
  list: () => readonly ErasedAuthor[];
  ids: () => readonly string[];
  add: (authorId: string) => void;
  restore: (authors: readonly ErasedAuthor[]) => void;
}>;

export const erasedAuthors = (db: DrizzleSqliteDODatabase): ErasedAuthors => ({
  list: () => db.select().from(erasedAuthor).all(),
  ids: () =>
    pipe(
      db.select().from(erasedAuthor).all(),
      Array.map(({ id }) => id),
    ),
  add: (authorId) => {
    db.insert(erasedAuthor).values({ id: authorId }).onConflictDoNothing().run();
  },
  restore: (authors) => {
    for (const chunk of rowChunks(authors)) {
      db.insert(erasedAuthor)
        .values([...chunk])
        .run();
    }
  },
});
