import { inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { db } from "./client.server";
import { erasedAuthor } from "./erased-author.table";

const BOUND_LIMIT = 90;

const erasedAmong = (authorIds: readonly string[]): Effect.Effect<ReadonlySet<string>> =>
  Effect.forEach(Array.chunksOf(Array.dedupe(authorIds), BOUND_LIMIT), (chunk) =>
    Effect.promise(() =>
      db
        .select({ id: erasedAuthor.id })
        .from(erasedAuthor)
        .where(inArray(erasedAuthor.id, [...chunk])),
    ),
  ).pipe(Effect.map((pages) => new Set(pages.flat().map(({ id }) => id))));

export { erasedAmong };
