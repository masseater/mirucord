import { asc, max } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import { searchChannel } from "#/entities/guild-message/model/search-segment.schema";

import { rowChunks } from "./bound-chunks.server";

const FIRST_POSITION = 0;
const NEXT = 1;

const knownChannels = (db: DrizzleSqliteDODatabase): ReadonlyMap<string, number> =>
  new Map(
    pipe(
      db.select().from(searchChannel).all(),
      Array.map(({ id, position }) => [id, position]),
    ),
  );

const nextPosition = (db: DrizzleSqliteDODatabase): number =>
  Option.fromUndefinedOr(
    db
      .select({ last: max(searchChannel.position) })
      .from(searchChannel)
      .get(),
  ).pipe(
    Option.flatMap(({ last }) => Option.fromNullOr(last)),
    Option.match({ onNone: () => FIRST_POSITION, onSome: (last) => last + NEXT }),
  );

const positionsOf = (
  db: DrizzleSqliteDODatabase,
  channelIds: readonly string[],
): ReadonlyMap<string, number> => {
  const known = knownChannels(db);
  const missing = Array.dedupe(
    pipe(
      channelIds,
      Array.filter((id) => !known.has(id)),
    ),
  );
  if (Array.isReadonlyArrayNonEmpty(missing)) {
    const start = nextPosition(db);
    const rows = pipe(
      missing,
      Array.map((id, index) => ({ id, position: start + index })),
    );
    for (const chunk of rowChunks(rows)) {
      db.insert(searchChannel)
        .values([...chunk])
        .run();
    }
    return knownChannels(db);
  }
  return known;
};

const channelList = (db: DrizzleSqliteDODatabase): readonly string[] =>
  pipe(
    db
      .select({ id: searchChannel.id })
      .from(searchChannel)
      .orderBy(asc(searchChannel.position))
      .all(),
    Array.map(({ id }) => id),
  );

export type SearchChannels = Readonly<{
  positions: (channelIds: readonly string[]) => ReadonlyMap<string, number>;
  list: () => readonly string[];
}>;

export const searchChannels = (db: DrizzleSqliteDODatabase): SearchChannels => ({
  positions: (channelIds) => positionsOf(db, channelIds),
  list: () => channelList(db),
});
