import { DurableObject } from "cloudflare:workers";
import { and, count, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/durable-sqlite";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Array, Effect, Option } from "effect";

import { erasedAuthor } from "#/entities/guild-message/model/erased-author.schema";
import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { messageSearch } from "#/entities/guild-message/model/message-search.fts";

import { GUILD_MIGRATIONS } from "./guild-migrations.server";

const BOUND_LIMIT = 90;
const NO_MESSAGES = 0;
const TOKEN_SEPARATOR = " ";

type StoredRow = Readonly<{
  id: string;
  channelId: string;
  authorId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
  describedWith: string | null;
}>;

type IndexedMessage = Readonly<{ row: StoredRow; tokens: readonly string[] }>;

type WriteMode = "overwrite" | "adopt";

type StoredState = Readonly<{ id: string; editedAt: number | null; describedWith: string | null }>;

type SealedMessage = Readonly<{
  id: string;
  channelId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
}>;

type ChannelCount = Readonly<{ channelId: string; messages: number }>;

type CreatedRange = Readonly<{ from: number | null; upTo: number | null }>;

type ReadPage = Readonly<{ before: string | null; limit: number }>;

type Seq = Readonly<{ seq: number }>;

const SEALED_COLUMNS = {
  id: guildMessage.id,
  channelId: guildMessage.channelId,
  sealed: guildMessage.sealed,
  createdAt: guildMessage.createdAt,
  editedAt: guildMessage.editedAt,
};

const matchOf = (tokens: readonly string[]): string =>
  tokens.map((token) => `"${token}"`).join(TOKEN_SEPARATOR);

const boundsOf = ({ from, upTo }: CreatedRange): readonly SQL[] => {
  const lower = Option.map(Option.fromNullOr(from), (time) => gte(guildMessage.createdAt, time));
  const upper = Option.map(Option.fromNullOr(upTo), (time) => lte(guildMessage.createdAt, time));
  return [...Option.toArray(lower), ...Option.toArray(upper)];
};

class GuildStore extends DurableObject {
  readonly #db = this.#open();

  #open(): DrizzleSqliteDODatabase {
    const db = drizzle(this.ctx.storage);
    migrate(db, { migrations: GUILD_MIGRATIONS });
    return db;
  }

  readonly #remigrate = Effect.sync(() => migrate(this.#db, { migrations: GUILD_MIGRATIONS }));

  #unindex(rows: readonly Seq[]): void {
    const seqs = rows.map(({ seq }) => seq);
    for (const chunk of Array.chunksOf(seqs, BOUND_LIMIT)) {
      this.#db
        .delete(messageSearch)
        .where(inArray(messageSearch.rowid, [...chunk]))
        .run();
    }
  }

  #upsert(row: StoredRow, mode: WriteMode): readonly Seq[] {
    const insert = this.#db.insert(guildMessage).values(row);
    if (mode === "adopt") {
      return insert.onConflictDoNothing().returning({ seq: guildMessage.seq }).all();
    }
    const changes = {
      sealed: row.sealed,
      editedAt: row.editedAt,
      describedWith: row.describedWith,
    };
    return insert
      .onConflictDoUpdate({ target: guildMessage.id, set: changes })
      .returning({ seq: guildMessage.seq })
      .all();
  }

  #write({ row, tokens }: IndexedMessage, mode: WriteMode): void {
    for (const { seq } of this.#upsert(row, mode)) {
      this.#unindex([{ seq }]);
      if (Array.isReadonlyArrayNonEmpty(tokens)) {
        this.#db
          .insert(messageSearch)
          .values({ rowid: seq, tokens: tokens.join(TOKEN_SEPARATOR) })
          .run();
      }
    }
  }

  #erasedAuthors(): readonly Readonly<{ id: string }>[] {
    return this.#db.select().from(erasedAuthor).all();
  }

  public write(messages: readonly IndexedMessage[], mode: WriteMode): void {
    const erased = new Set(this.#erasedAuthors().map(({ id }) => id));
    for (const message of messages) {
      if (!erased.has(message.row.authorId)) {
        this.#write(message, mode);
      }
    }
  }

  public stored(ids: readonly string[]): readonly StoredState[] {
    return Array.chunksOf(ids, BOUND_LIMIT).flatMap((chunk) =>
      this.#db
        .select({
          id: guildMessage.id,
          editedAt: guildMessage.editedAt,
          describedWith: guildMessage.describedWith,
        })
        .from(guildMessage)
        .where(inArray(guildMessage.id, [...chunk]))
        .all(),
    );
  }

  public idsInChannel(channelId: string, ids: readonly string[]): readonly string[] {
    const inChannel = eq(guildMessage.channelId, channelId);
    return Array.chunksOf(ids, BOUND_LIMIT).flatMap((chunk) => {
      const listed = inArray(guildMessage.id, [...chunk]);
      return this.#db
        .select({ id: guildMessage.id })
        .from(guildMessage)
        .where(and(inChannel, listed))
        .all()
        .map(({ id }) => id);
    });
  }

  public idsBetween(channelId: string, range: CreatedRange): readonly string[] {
    const conditions = [eq(guildMessage.channelId, channelId), ...boundsOf(range)];
    return this.#db
      .select({ id: guildMessage.id })
      .from(guildMessage)
      .where(and(...conditions))
      .all()
      .map(({ id }) => id);
  }

  public remove(ids: readonly string[]): void {
    for (const chunk of Array.chunksOf(ids, BOUND_LIMIT)) {
      this.#unindex(
        this.#db
          .delete(guildMessage)
          .where(inArray(guildMessage.id, [...chunk]))
          .returning({ seq: guildMessage.seq })
          .all(),
      );
    }
  }

  #removeMatching(column: "authorId" | "channelId", value: string): void {
    this.#unindex(
      this.#db
        .delete(guildMessage)
        .where(eq(guildMessage[column], value))
        .returning({ seq: guildMessage.seq })
        .all(),
    );
  }

  public eraseAuthor(authorId: string): void {
    this.#db.insert(erasedAuthor).values({ id: authorId }).onConflictDoNothing().run();
    this.#removeMatching("authorId", authorId);
  }

  public removeChannel(channelId: string): void {
    this.#removeMatching("channelId", channelId);
  }

  public clear(): Promise<void> {
    const erased = this.#erasedAuthors();
    const restore = Effect.sync(() => {
      if (Array.isReadonlyArrayNonEmpty(erased)) {
        this.#db
          .insert(erasedAuthor)
          .values([...erased])
          .run();
      }
    });
    return Effect.runPromise(
      Effect.promise(() => this.ctx.storage.deleteAll()).pipe(
        Effect.andThen(this.#remigrate),
        Effect.andThen(restore),
      ),
    );
  }

  public channels(): readonly string[] {
    return this.#db
      .selectDistinct({ channelId: guildMessage.channelId })
      .from(guildMessage)
      .all()
      .map(({ channelId }) => channelId);
  }

  public count(): number {
    const total = this.#db.select({ messages: count() }).from(guildMessage).get();
    return Option.match(Option.fromUndefinedOr(total), {
      onNone: () => NO_MESSAGES,
      onSome: ({ messages }) => messages,
    });
  }

  public countByChannel(channelIds: readonly string[]): readonly ChannelCount[] {
    return Array.chunksOf(channelIds, BOUND_LIMIT).flatMap((chunk) =>
      this.#db
        .select({ channelId: guildMessage.channelId, messages: count() })
        .from(guildMessage)
        .where(inArray(guildMessage.channelId, [...chunk]))
        .groupBy(guildMessage.channelId)
        .all(),
    );
  }

  public candidates(
    tokens: readonly string[],
    channelIds: readonly string[],
  ): readonly SealedMessage[] {
    const matched = this.#db
      .select({ seq: messageSearch.rowid })
      .from(messageSearch)
      .where(eq(messageSearch.messageSearch, matchOf(tokens)));
    const channels = new Set(channelIds);
    return this.#db
      .select(SEALED_COLUMNS)
      .from(guildMessage)
      .where(inArray(guildMessage.seq, matched))
      .orderBy(desc(guildMessage.createdAt), desc(guildMessage.id))
      .all()
      .filter(({ channelId }) => channels.has(channelId));
  }

  #createdAtOf(channelId: string, id: string): Option.Option<number> {
    const target = and(eq(guildMessage.id, id), eq(guildMessage.channelId, channelId));
    const found = this.#db
      .select({ createdAt: guildMessage.createdAt })
      .from(guildMessage)
      .where(target)
      .get();
    return Option.map(Option.fromUndefinedOr(found), ({ createdAt }) => createdAt);
  }

  public read(channelId: string, { before, limit }: ReadPage): readonly SealedMessage[] {
    const olderThan = Option.fromNullOr(before).pipe(
      Option.flatMap((id) => this.#createdAtOf(channelId, id)),
      Option.map((createdAt) => lt(guildMessage.createdAt, createdAt)),
    );
    const conditions = [eq(guildMessage.channelId, channelId), ...Option.toArray(olderThan)];
    return this.#db
      .select(SEALED_COLUMNS)
      .from(guildMessage)
      .where(and(...conditions))
      .orderBy(desc(guildMessage.createdAt))
      .limit(limit)
      .all();
  }
}

export { GuildStore };
export type {
  ChannelCount,
  CreatedRange,
  IndexedMessage,
  ReadPage,
  SealedMessage,
  StoredRow,
  StoredState,
  WriteMode,
};
