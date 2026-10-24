import { DurableObject } from "cloudflare:workers";
import { and, count, desc, eq, inArray, lt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/durable-sqlite";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Effect, Option, pipe } from "effect";

import { erasedAuthor } from "#/entities/guild-message/model/erased-author.schema";
import {
  BOUND_LIMIT,
  guildMessage,
  TRACKED_COLUMNS,
} from "#/entities/guild-message/model/guild-message.schema";

import { migrateGuild } from "./guild-migrations.server";
import { messageQueries } from "./message-queries.server";
import { nextVersion, searchHooks } from "./search-hooks.server";
import type {
  ChannelCount,
  CreatedRange,
  ExtractedHashes,
  IndexedMessage,
  PhraseColumn,
  PhraseState,
  ReadPage,
  SealedMessage,
  StoredRow,
  StoredState,
  TrackedRow,
  UnphrasedMessage,
  WriteMode,
} from "./store-types";

const NO_MESSAGES = 0;
const NEXT_WRITE = 1;

type Seq = Readonly<{ seq: number }>;

type Versioned = StoredRow & Readonly<{ tokens: readonly number[]; version: number }>;

const SEALED_COLUMNS = {
  id: guildMessage.id,
  channelId: guildMessage.channelId,
  sealed: guildMessage.sealed,
  createdAt: guildMessage.createdAt,
  editedAt: guildMessage.editedAt,
};

abstract class MessageStore extends DurableObject {
  protected readonly db = this.#open();

  protected abstract recordPhrases(message: UnphrasedMessage, hashes: ExtractedHashes): void;

  protected abstract countWrites(written: number): void;

  protected abstract forgetPhrases(column: PhraseColumn, values: readonly string[]): void;

  #open(): DrizzleSqliteDODatabase {
    const db = drizzle(this.ctx.storage);
    migrateGuild(db);
    return db;
  }

  readonly #remigrate = Effect.sync(() => {
    migrateGuild(this.db);
  });

  readonly #queries = messageQueries(this.db);

  protected readonly search = searchHooks({
    db: this.db,
    alarms: {
      current: () => this.ctx.storage.getAlarm(),
      set: (at) => this.ctx.storage.setAlarm(at),
    },
    bucket: this.env.SEARCH,
    guildId: Option.fromUndefinedOr(this.ctx.id.name),
  });

  #tracked(ids: readonly string[]): readonly TrackedRow[] {
    return this.#queries.tracked(ids);
  }

  #upsert(row: Versioned, phrases: PhraseState, mode: WriteMode): readonly Seq[] {
    const insert = this.db.insert(guildMessage).values({ ...row, phrases: phrases.status });
    if (mode === "adopt") {
      return insert.onConflictDoNothing().returning({ seq: guildMessage.seq }).all();
    }
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
    return insert
      .onConflictDoUpdate({ target: guildMessage.id, set: changes })
      .returning({ seq: guildMessage.seq })
      .all();
  }

  #write({ row, tokens, phrases }: IndexedMessage, version: number, mode: WriteMode): void {
    const written = this.#upsert({ ...row, tokens, version }, phrases, mode);
    if (Array.isReadonlyArrayNonEmpty(written) && phrases.status === "extracted") {
      this.recordPhrases(row, phrases.hashes);
      this.countWrites(NEXT_WRITE);
    }
  }

  protected erasedAuthors(): readonly Readonly<{ id: string }>[] {
    return this.db.select().from(erasedAuthor).all();
  }

  #previous(kept: readonly IndexedMessage[], mode: WriteMode): readonly TrackedRow[] {
    if (mode === "adopt") {
      return [];
    }
    return this.#tracked(
      pipe(
        kept,
        Array.map(({ row }) => row.id),
      ),
    );
  }

  #writeKept(messages: readonly IndexedMessage[], mode: WriteMode): Effect.Effect<void> {
    const erased = new Set(
      pipe(
        this.erasedAuthors(),
        Array.map(({ id }) => id),
      ),
    );
    const kept = pipe(
      messages,
      Array.filter(({ row }) => !erased.has(row.authorId)),
    );
    if (Array.isReadonlyArrayEmpty(kept)) {
      return Effect.void;
    }
    const previous = this.#previous(kept, mode);
    const version = nextVersion(this.db);
    for (const message of kept) {
      this.#write(message, version, mode);
    }
    return this.search.forget(previous).pipe(Effect.andThen(this.search.flushLater()));
  }

  public write(messages: readonly IndexedMessage[], mode: WriteMode): Promise<void> {
    return Effect.runPromise(Effect.suspend(() => this.#writeKept(messages, mode)));
  }

  public publish(): Promise<void> {
    return Effect.runPromise(this.search.publish("now"));
  }

  public stored(ids: readonly string[]): readonly StoredState[] {
    return this.#queries.stored(ids);
  }

  public idsInChannel(channelId: string, ids: readonly string[]): readonly string[] {
    return this.#queries.idsInChannel(channelId, ids);
  }

  public idsBetween(channelId: string, range: CreatedRange): readonly string[] {
    return this.#queries.idsBetween(channelId, range);
  }

  #deleteWhere(conditions: readonly SQL[]): void {
    for (const condition of conditions) {
      this.db.delete(guildMessage).where(condition).run();
    }
  }

  #removeWhere(rows: readonly TrackedRow[], conditions: readonly SQL[]): Promise<void> {
    const deleted = Effect.sync(() => {
      this.#deleteWhere(conditions);
    });
    return Effect.runPromise(this.search.forget(rows).pipe(Effect.andThen(deleted)));
  }

  public remove(ids: readonly string[]): Promise<void> {
    this.forgetPhrases("messageId", ids);
    const listed = pipe(
      Array.chunksOf(ids, BOUND_LIMIT),
      Array.map((chunk) => inArray(guildMessage.id, [...chunk])),
    );
    return this.#removeWhere(this.#tracked(ids), listed);
  }

  #removeMatching(column: "authorId" | "channelId", value: string): Promise<void> {
    this.forgetPhrases(column, [value]);
    const matching = eq(guildMessage[column], value);
    const rows = this.db.select(TRACKED_COLUMNS).from(guildMessage).where(matching).all();
    return this.#removeWhere(rows, [matching]);
  }

  public eraseAuthor(authorId: string): Promise<void> {
    this.db.insert(erasedAuthor).values({ id: authorId }).onConflictDoNothing().run();
    return this.#removeMatching("authorId", authorId);
  }

  public removeChannel(channelId: string): Promise<void> {
    return this.#removeMatching("channelId", channelId);
  }

  public clear(): Promise<void> {
    const erased = this.erasedAuthors();
    const restore = Effect.sync(() => {
      if (Array.isReadonlyArrayNonEmpty(erased)) {
        this.db
          .insert(erasedAuthor)
          .values([...erased])
          .run();
      }
    });
    const wiped = Effect.promise(() => this.ctx.storage.deleteAll());
    return Effect.runPromise(
      this.search
        .clearFiles()
        .pipe(Effect.andThen(wiped), Effect.andThen(this.#remigrate), Effect.andThen(restore)),
    );
  }

  public channels(): readonly string[] {
    return pipe(
      this.db.selectDistinct({ channelId: guildMessage.channelId }).from(guildMessage).all(),
      Array.map(({ channelId }) => channelId),
    );
  }

  public count(): number {
    const total = this.db.select({ messages: count() }).from(guildMessage).get();
    return Option.match(Option.fromUndefinedOr(total), {
      onNone: () => NO_MESSAGES,
      onSome: ({ messages }) => messages,
    });
  }

  public countByChannel(channelIds: readonly string[]): readonly ChannelCount[] {
    return this.#queries.countByChannel(channelIds);
  }

  #createdAtOf(channelId: string, id: string): Option.Option<number> {
    const target = and(eq(guildMessage.id, id), eq(guildMessage.channelId, channelId));
    const found = this.db
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
    return this.db
      .select(SEALED_COLUMNS)
      .from(guildMessage)
      .where(and(...conditions))
      .orderBy(desc(guildMessage.createdAt))
      .limit(limit)
      .all();
  }
}

export { MessageStore, SEALED_COLUMNS };
