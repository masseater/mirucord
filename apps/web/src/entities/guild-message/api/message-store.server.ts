import { and, count, desc, eq, inArray, lt } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array, Effect, Option, pipe } from "effect";

import {
  BOUND_LIMIT,
  guildMessage,
  SEALED_COLUMNS,
  TRACKED_COLUMNS,
} from "#/entities/guild-message/model/guild-message.schema";
import { TracedDurableObject } from "#/shared/observability/index.server";

import { erasedAuthors } from "./erased-authors.server.ts";
import { migrateGuild, openGuild } from "./guild-migrations.server.ts";
import { messageQueries } from "./message-queries.server.ts";
import { latestPerId, writeMessages } from "./message-write.server.ts";
import { nextVersion, searchHooks } from "./search-hooks.server.ts";
import type {
  AuthoredMessage,
  AuthorPage,
  ChannelCount,
  ChannelOldest,
  CreatedRange,
  ExtractedPhrases,
  IndexedMessage,
  PhraseColumn,
  ReadPage,
  SealedMessage,
  StoredState,
  TrackedRow,
  WriteMode,
} from "./store-types.ts";

const NO_MESSAGES = 0;

export abstract class MessageStore extends TracedDurableObject {
  protected readonly db = openGuild(this.ctx.storage);

  protected abstract recordPhrases(extracted: readonly ExtractedPhrases[]): void;

  protected abstract countWrites(written: number): void;

  protected abstract forgetPhrases(column: PhraseColumn, values: readonly string[]): void;

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

  #recordExtracted(extracted: readonly ExtractedPhrases[]): void {
    if (Array.isReadonlyArrayNonEmpty(extracted)) {
      this.recordPhrases(extracted);
      this.countWrites(extracted.length);
    }
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
    const erased = new Set(erasedAuthors(this.db).ids());
    const kept = pipe(
      messages,
      Array.filter(({ row }) => !erased.has(row.authorId)),
    );
    if (Array.isReadonlyArrayEmpty(kept)) {
      return Effect.void;
    }
    const latest = latestPerId(kept);
    const previous = this.#previous(latest, mode);
    this.#recordExtracted(
      writeMessages({ db: this.db, items: latest, previous, version: nextVersion(this.db) }),
    );
    return this.search.forget(previous).pipe(Effect.andThen(this.search.flushLater()));
  }

  public write(messages: readonly IndexedMessage[], mode: WriteMode): Promise<void> {
    return this.traced(Effect.suspend(() => this.#writeKept(messages, mode)));
  }

  public publish(): Promise<void> {
    return this.traced(this.search.publish("now"));
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
    return this.traced(this.search.forget(rows).pipe(Effect.andThen(deleted)));
  }

  public remove(ids: readonly string[]): Promise<void> {
    this.forgetPhrases("messageId", ids);
    const listed = pipe(
      Array.chunksOf(ids, BOUND_LIMIT),
      Array.map((chunk) => inArray(guildMessage.id, [...chunk])),
    );
    return this.#removeWhere(this.#tracked(ids), listed);
  }

  #removeMatching(column: Exclude<PhraseColumn, "messageId">, value: string): Promise<void> {
    this.forgetPhrases(column, [value]);
    const matching = eq(guildMessage[column], value);
    const rows = this.db.select(TRACKED_COLUMNS).from(guildMessage).where(matching).all();
    return this.#removeWhere(rows, [matching]);
  }

  public eraseAuthor(authorId: string): Promise<void> {
    erasedAuthors(this.db).add(authorId);
    return this.#removeMatching("authorId", authorId);
  }

  public removeChannel(channelId: string): Promise<void> {
    return this.#removeMatching("channelId", channelId);
  }

  public clear(): Promise<void> {
    const erased = erasedAuthors(this.db).list();
    const restore = Effect.sync(() => {
      erasedAuthors(this.db).restore(erased);
    });
    const wiped = Effect.promise(() => this.ctx.storage.deleteAll());
    return this.traced(
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

  public oldestByChannel(channelIds: readonly string[]): readonly ChannelOldest[] {
    return this.#queries.oldestByChannel(channelIds);
  }

  public authors(ids: readonly string[]): readonly AuthoredMessage[] {
    return this.#queries.authors(ids);
  }

  public readByAuthor(page: AuthorPage): readonly SealedMessage[] {
    return this.#queries.byAuthor(page);
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
