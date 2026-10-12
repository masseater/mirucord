import { DurableObject } from "cloudflare:workers";
import { and, count, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/durable-sqlite";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { Array, Effect, Option } from "effect";

import { erasedAuthor } from "#/entities/guild-message/model/erased-author.schema";
import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import type {
  ChannelCount,
  CreatedRange,
  IndexedMessage,
  ReadPage,
  SealedMessage,
  StoredRow,
  StoredState,
  TrackedRow,
  WriteMode,
} from "#/entities/guild-message/model/stored-message";
import { BOUND_LIMIT, TRACKED_COLUMNS } from "#/entities/guild-message/model/stored-message";

import { GUILD_MIGRATIONS } from "./guild-migrations.server";
import { nextVersion, searchHooks } from "./search-hooks.server";

const NO_MESSAGES = 0;

const SEALED_COLUMNS = {
  id: guildMessage.id,
  channelId: guildMessage.channelId,
  sealed: guildMessage.sealed,
  createdAt: guildMessage.createdAt,
  editedAt: guildMessage.editedAt,
};

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

  readonly #search = searchHooks({
    db: this.#db,
    alarms: {
      current: () => this.ctx.storage.getAlarm(),
      set: (at) => this.ctx.storage.setAlarm(at),
    },
    bucket: this.env.SEARCH,
    guildId: Option.fromUndefinedOr(this.ctx.id.name),
  });

  #tracked(ids: readonly string[]): readonly TrackedRow[] {
    return Array.chunksOf(ids, BOUND_LIMIT).flatMap((chunk) =>
      this.#db
        .select(TRACKED_COLUMNS)
        .from(guildMessage)
        .where(inArray(guildMessage.id, [...chunk]))
        .all(),
    );
  }

  #upsert(
    row: StoredRow & Readonly<{ tokens: readonly number[]; version: number }>,
    mode: WriteMode,
  ): void {
    const insert = this.#db.insert(guildMessage).values(row);
    if (mode === "adopt") {
      insert.onConflictDoNothing().run();
      return;
    }
    insert
      .onConflictDoUpdate({
        target: guildMessage.id,
        set: {
          sealed: row.sealed,
          editedAt: row.editedAt,
          describedWith: row.describedWith,
          tokens: row.tokens,
          version: row.version,
        },
      })
      .run();
  }

  #erasedAuthors(): readonly Readonly<{ id: string }>[] {
    return this.#db.select().from(erasedAuthor).all();
  }

  #previous(kept: readonly IndexedMessage[], mode: WriteMode): readonly TrackedRow[] {
    if (mode === "adopt") {
      return [];
    }
    return this.#tracked(kept.map(({ row }) => row.id));
  }

  #writeKept(messages: readonly IndexedMessage[], mode: WriteMode): Effect.Effect<void> {
    const erased = new Set(this.#erasedAuthors().map(({ id }) => id));
    const kept = messages.filter(({ row }) => !erased.has(row.authorId));
    if (Array.isReadonlyArrayEmpty(kept)) {
      return Effect.void;
    }
    const previous = this.#previous(kept, mode);
    const version = nextVersion(this.#db);
    for (const { row, tokens } of kept) {
      this.#upsert({ ...row, tokens, version }, mode);
    }
    return this.#search.forget(previous).pipe(Effect.andThen(this.#search.flushLater()));
  }

  public write(messages: readonly IndexedMessage[], mode: WriteMode): Promise<void> {
    return Effect.runPromise(Effect.suspend(() => this.#writeKept(messages, mode)));
  }

  public publish(): Promise<void> {
    return Effect.runPromise(this.#search.publish());
  }

  public override alarm(): Promise<void> {
    return this.publish();
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

  #deleteWhere(conditions: readonly SQL[]): void {
    for (const condition of conditions) {
      this.#db.delete(guildMessage).where(condition).run();
    }
  }

  #removeWhere(rows: readonly TrackedRow[], conditions: readonly SQL[]): Promise<void> {
    const deleted = Effect.sync(() => {
      this.#deleteWhere(conditions);
    });
    return Effect.runPromise(this.#search.forget(rows).pipe(Effect.andThen(deleted)));
  }

  public remove(ids: readonly string[]): Promise<void> {
    const listed = Array.chunksOf(ids, BOUND_LIMIT).map((chunk) =>
      inArray(guildMessage.id, [...chunk]),
    );
    return this.#removeWhere(this.#tracked(ids), listed);
  }

  #removeMatching(column: "authorId" | "channelId", value: string): Promise<void> {
    const matching = eq(guildMessage[column], value);
    const rows = this.#db.select(TRACKED_COLUMNS).from(guildMessage).where(matching).all();
    return this.#removeWhere(rows, [matching]);
  }

  public eraseAuthor(authorId: string): Promise<void> {
    this.#db.insert(erasedAuthor).values({ id: authorId }).onConflictDoNothing().run();
    return this.#removeMatching("authorId", authorId);
  }

  public removeChannel(channelId: string): Promise<void> {
    return this.#removeMatching("channelId", channelId);
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
    const files = this.#search.clearFiles();
    const wiped = Effect.promise(() => this.ctx.storage.deleteAll());
    return Effect.runPromise(
      files.pipe(Effect.andThen(wiped), Effect.andThen(this.#remigrate), Effect.andThen(restore)),
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
