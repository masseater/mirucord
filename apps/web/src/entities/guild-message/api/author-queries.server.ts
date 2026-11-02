import { and, desc, eq, lt } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Option, pipe } from "effect";

import { guildMessage, SEALED_COLUMNS } from "#/entities/guild-message/model/guild-message.schema";

import type { AuthorPage, SealedMessage } from "./store-types";

const AUTHOR_PAGE = 200;

type Cursor = Readonly<{ olderThan: Option.Option<number>; found: readonly SealedMessage[] }>;

const authoredAt = (
  db: DrizzleSqliteDODatabase,
  { authorId, id }: Readonly<{ authorId: string; id: string }>,
): Option.Option<number> => {
  const found = db
    .select({ createdAt: guildMessage.createdAt })
    .from(guildMessage)
    .where(and(eq(guildMessage.id, id), eq(guildMessage.authorId, authorId)))
    .get();
  return pipe(
    Option.fromUndefinedOr(found),
    Option.map(({ createdAt }) => createdAt),
  );
};

const authorPage = (
  db: DrizzleSqliteDODatabase,
  { authorId, olderThan }: Readonly<{ authorId: string; olderThan: Option.Option<number> }>,
): readonly SealedMessage[] => {
  const older = pipe(
    olderThan,
    Option.map((createdAt) => lt(guildMessage.createdAt, createdAt)),
  );
  return db
    .select(SEALED_COLUMNS)
    .from(guildMessage)
    .where(and(eq(guildMessage.authorId, authorId), ...Option.toArray(older)))
    .orderBy(desc(guildMessage.createdAt))
    .limit(AUTHOR_PAGE)
    .all();
};

const authorQueries =
  (db: DrizzleSqliteDODatabase) =>
  (request: AuthorPage): readonly SealedMessage[] => {
    const visible = new Set(request.channelIds);
    const collect = (cursor: Cursor): readonly SealedMessage[] => {
      const page = authorPage(db, { authorId: request.authorId, olderThan: cursor.olderThan });
      const found = [
        ...cursor.found,
        ...pipe(
          page,
          Array.filter(({ channelId }) => visible.has(channelId)),
        ),
      ];
      const last = Array.last(page);
      if (found.length >= request.limit || page.length < AUTHOR_PAGE || Option.isNone(last)) {
        return Array.take(found, request.limit);
      }
      return collect({
        olderThan: pipe(
          last,
          Option.map(({ createdAt }) => createdAt),
        ),
        found,
      });
    };
    return collect({
      olderThan: pipe(
        Option.fromNullOr(request.before),
        Option.flatMap((id) => authoredAt(db, { authorId: request.authorId, id })),
      ),
      found: [],
    });
  };

export { authorQueries };
