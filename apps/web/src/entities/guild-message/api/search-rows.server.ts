import { inArray } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option } from "effect";

import type { SealedEntry } from "#/entities/guild-message/lib/search-segment";
import { BOUND_LIMIT, guildMessage } from "#/entities/guild-message/model/guild-message.schema";

const sealedEntries = (
  db: DrizzleSqliteDODatabase,
  ids: readonly string[],
): readonly SealedEntry[] => {
  const rows = Array.chunksOf(ids, BOUND_LIMIT).flatMap((chunk) =>
    db
      .select({
        id: guildMessage.id,
        channelId: guildMessage.channelId,
        sealed: guildMessage.sealed,
        createdAt: guildMessage.createdAt,
        editedAt: guildMessage.editedAt,
      })
      .from(guildMessage)
      .where(inArray(guildMessage.id, [...chunk]))
      .all(),
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => Option.toArray(Option.fromUndefinedOr(byId.get(id))));
};

const changedSince = (
  db: DrizzleSqliteDODatabase,
  ids: readonly string[],
  built: number,
): readonly number[] => {
  const versions = Array.chunksOf(ids, BOUND_LIMIT).flatMap((chunk) =>
    db
      .select({ id: guildMessage.id, version: guildMessage.version })
      .from(guildMessage)
      .where(inArray(guildMessage.id, [...chunk]))
      .all(),
  );
  const current = new Map(versions.map(({ id, version }) => [id, version]));
  return ids.flatMap((id, ordinal) =>
    Array.filter([ordinal], () =>
      Option.match(Option.fromUndefinedOr(current.get(id)), {
        onNone: () => true,
        onSome: (version) => version > built,
      }),
    ),
  );
};

type SearchRows = Readonly<{
  entries: (ids: readonly string[]) => readonly SealedEntry[];
  changedSince: (ids: readonly string[], built: number) => readonly number[];
}>;

const searchRows = (db: DrizzleSqliteDODatabase): SearchRows => ({
  entries: (ids: readonly string[]): readonly SealedEntry[] => sealedEntries(db, ids),
  changedSince: (ids: readonly string[], built: number): readonly number[] =>
    changedSince(db, ids, built),
});

export { searchRows };
export type { SearchRows };
