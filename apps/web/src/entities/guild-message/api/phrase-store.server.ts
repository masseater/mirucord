import { and, count, desc, eq, gte, inArray, lt, max } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array, Duration, Option, Order, pipe } from "effect";

import { phraseTotals } from "#/entities/guild-message/lib/phrase-totals";
import { PHRASE_WINDOW_DAYS } from "#/entities/guild-message/lib/phrases.server";
import type { PhraseHash } from "#/entities/guild-message/lib/phrases.server";
import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { phraseLedger, phraseStats } from "#/entities/guild-message/model/phrase-stats.schema";
import { phraseUse } from "#/entities/guild-message/model/phrase-use.schema";

import { MessageStore, SEALED_COLUMNS } from "./message-store.server";
import type {
  PhraseContext,
  PhraseExample,
  PhraseStatsLookup,
  PhraseTally,
  SavedStats,
  SealedMessage,
  UnphrasedMessage,
} from "./store-types";

type Ledger = Readonly<{
  guildId: string | null;
  written: number;
  generation: number;
  backfillRequestedAt: number;
}>;

const BOUND_LIMIT = 90;
const LEDGER_ID = 1;
const NOTHING_WRITTEN = 0;
const NEXT_GENERATION = 1;
const NEVER = 0;
const byUsesDescending = Order.flip(
  Order.mapInput(Order.Number, ({ uses }: Readonly<{ uses: number }>) => uses),
);
const MIN_USES = 5;
const MIN_PEOPLE = 3;
const PRESENT_USES = 2;
const PRESENCE_LIMIT = 500;
const EXAMPLES_PER_PHRASE = 2;
const EXAMPLE_SCAN = 20;
const PREVIOUS_MESSAGES = 1;
const REFRESH_AFTER_WRITES = 200;
const REFRESH_AFTER_DAYS = 1;
const BACKFILL_RETRY_MINUTES = 10;
const REFRESH_AFTER_MS = Duration.toMillis(Duration.days(REFRESH_AFTER_DAYS));
const BACKFILL_RETRY_MS = Duration.toMillis(Duration.minutes(BACKFILL_RETRY_MINUTES));
const PHRASE_WINDOW_MS = Duration.toMillis(Duration.days(PHRASE_WINDOW_DAYS));

const EMPTY_LEDGER: Ledger = {
  guildId: Option.getOrNull(Option.none<string>()),
  written: NOTHING_WRITTEN,
  generation: NOTHING_WRITTEN,
  backfillRequestedAt: NEVER,
};

const inWindow = (now: number): SQL => gte(guildMessage.createdAt, now - PHRASE_WINDOW_MS);

abstract class PhraseStore extends MessageStore {
  protected ledgerOf(): Ledger {
    const found = this.db
      .select({
        guildId: phraseLedger.guildId,
        written: phraseLedger.written,
        generation: phraseLedger.generation,
        backfillRequestedAt: phraseLedger.backfillRequestedAt,
      })
      .from(phraseLedger)
      .where(eq(phraseLedger.id, LEDGER_ID))
      .get();
    return Option.getOrElse(Option.fromUndefinedOr(found), () => EMPTY_LEDGER);
  }

  protected saveLedger(ledger: Ledger): void {
    this.db
      .insert(phraseLedger)
      .values({ id: LEDGER_ID, ...ledger })
      .onConflictDoUpdate({ target: phraseLedger.id, set: ledger })
      .run();
  }

  protected override countWrites(written: number): void {
    const ledger = this.ledgerOf();
    this.saveLedger({ ...ledger, written: ledger.written + written });
  }

  protected override recordPhrases(message: UnphrasedMessage, hashes: readonly PhraseHash[]): void {
    this.db.delete(phraseUse).where(eq(phraseUse.messageId, message.id)).run();
    if (Array.isReadonlyArrayNonEmpty(hashes)) {
      this.db
        .insert(phraseUse)
        .values(
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
          ),
        )
        .onConflictDoNothing()
        .run();
    }
  }

  protected forgetStats(): void {
    this.db.delete(phraseStats).where(gte(phraseStats.computedAt, NEVER)).run();
    const ledger = this.ledgerOf();
    this.saveLedger({ ...ledger, generation: ledger.generation + NEXT_GENERATION });
  }

  protected override forgetPhrases(
    column: "messageId" | "authorId" | "channelId",
    values: readonly string[],
  ): void {
    this.forgetStats();
    for (const chunk of Array.chunksOf(values, BOUND_LIMIT)) {
      this.db
        .delete(phraseUse)
        .where(inArray(phraseUse[column], [...chunk]))
        .run();
    }
  }

  protected unphrasedMessages(now: number, limit: number): readonly UnphrasedMessage[] {
    return this.db
      .select({ ...SEALED_COLUMNS, authorId: guildMessage.authorId })
      .from(guildMessage)
      .where(and(eq(guildMessage.phrases, "pending"), inWindow(now)))
      .orderBy(desc(guildMessage.createdAt))
      .limit(limit)
      .all();
  }

  protected lookupStats(visibility: string, now: number): PhraseStatsLookup {
    const { written } = this.ledgerOf();
    const fresh = Option.fromUndefinedOr(
      this.db.select().from(phraseStats).where(eq(phraseStats.visibility, visibility)).get(),
    ).pipe(
      Option.filter(
        (cached) =>
          written - cached.written < REFRESH_AFTER_WRITES &&
          now - cached.computedAt < REFRESH_AFTER_MS,
      ),
    );
    return Option.match(fresh, {
      onNone: (): PhraseStatsLookup => ({ status: "stale" }),
      onSome: ({ body }): PhraseStatsLookup => ({ status: "fresh", body }),
    });
  }

  protected claimBackfill(guildId: string, now: number): boolean {
    const ledger = this.ledgerOf();
    const due =
      now - ledger.backfillRequestedAt >= BACKFILL_RETRY_MS &&
      Array.isReadonlyArrayNonEmpty(this.unphrasedMessages(now, PREVIOUS_MESSAGES));
    if (due) {
      this.saveLedger({ ...ledger, guildId, backfillRequestedAt: now });
    }
    return due;
  }

  protected tallyPhrases(channelIds: readonly string[], now: number): PhraseTally {
    const ledger = this.ledgerOf();
    const channels = new Set(channelIds);
    const rows = this.db
      .select({
        phrase: phraseUse.phrase,
        common: phraseUse.common,
        channelId: phraseUse.channelId,
        authorId: phraseUse.authorId,
        uses: count(),
        lastUsedAt: max(phraseUse.createdAt),
      })
      .from(phraseUse)
      .where(gte(phraseUse.createdAt, now - PHRASE_WINDOW_MS))
      .groupBy(phraseUse.phrase, phraseUse.common, phraseUse.channelId, phraseUse.authorId)
      .all();
    const totals = pipe(
      rows,
      Array.filter(({ channelId }) => channels.has(channelId)),
      phraseTotals,
    );
    return {
      written: ledger.written,
      generation: ledger.generation,
      candidates: pipe(
        totals,
        Array.filter(({ uses, people }) => uses >= MIN_USES && people >= MIN_PEOPLE),
      ),
      presence: pipe(
        totals,
        Array.filter(({ uses }) => uses >= PRESENT_USES),
        (present) => Array.sort(present, byUsesDescending),
        Array.take(PRESENCE_LIMIT),
        Array.map(({ common }) => common),
      ),
    };
  }

  protected examplesOf(
    phrases: readonly string[],
    channelIds: readonly string[],
  ): readonly PhraseExample[] {
    const channels = new Set(channelIds);
    return pipe(
      phrases,
      Array.map((phrase) => {
        const uses = this.db
          .select({ messageId: phraseUse.messageId, channelId: phraseUse.channelId })
          .from(phraseUse)
          .where(eq(phraseUse.phrase, phrase))
          .orderBy(desc(phraseUse.createdAt))
          .limit(EXAMPLE_SCAN)
          .all();
        const messageIds = pipe(
          uses,
          Array.filter(({ channelId }) => channels.has(channelId)),
          Array.take(EXAMPLES_PER_PHRASE),
          Array.map(({ messageId }) => messageId),
        );
        return { phrase, messageIds };
      }),
    );
  }

  protected saveStats(visibility: string, { generation, ...stats }: SavedStats): void {
    if (this.ledgerOf().generation !== generation) {
      return;
    }
    this.db
      .insert(phraseStats)
      .values({ visibility, ...stats })
      .onConflictDoUpdate({ target: phraseStats.visibility, set: stats })
      .run();
  }

  protected previousOf(message: SealedMessage): readonly SealedMessage[] {
    return this.db
      .select(SEALED_COLUMNS)
      .from(guildMessage)
      .where(
        and(
          eq(guildMessage.channelId, message.channelId),
          lt(guildMessage.createdAt, message.createdAt),
        ),
      )
      .orderBy(desc(guildMessage.createdAt))
      .limit(PREVIOUS_MESSAGES)
      .all();
  }

  protected contextsOf(messageIds: readonly string[]): readonly PhraseContext[] {
    return pipe(
      Array.chunksOf(messageIds, BOUND_LIMIT),
      Array.flatMap((chunk) =>
        pipe(
          this.db
            .select(SEALED_COLUMNS)
            .from(guildMessage)
            .where(inArray(guildMessage.id, [...chunk]))
            .all(),
          Array.map((message) => ({
            messageId: message.id,
            messages: [...this.previousOf(message), message],
          })),
        ),
      ),
    );
  }

  protected markExtracted(messageId: string): boolean {
    return Array.isReadonlyArrayNonEmpty(
      this.db
        .update(guildMessage)
        .set({ phrases: "extracted" })
        .where(eq(guildMessage.id, messageId))
        .returning({ id: guildMessage.id })
        .all(),
    );
  }
}

export { PhraseStore };
export type { Ledger };
