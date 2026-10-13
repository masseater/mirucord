import { Clock, Effect, Option } from "effect";

import { NoteStore } from "./note-store.server";
import { backfillPhrases } from "./phrase-backfill.server";
import type {
  ExtractedPhrases,
  NoteClaim,
  PhraseContext,
  PhraseExample,
  PhraseNote,
  PhraseRequest,
  PhraseStatsLookup,
  PhraseTally,
  SavedStats,
  UnphrasedMessage,
} from "./store-types";
import { vectorLedger } from "./vector-ledger.server";
import type { Coverage } from "./vector-ledger.server";

class GuildStore extends NoteStore {
  public phraseStats({
    guildId,
    visibility,
    now,
  }: PhraseRequest): Promise<Readonly<{ lookup: PhraseStatsLookup }>> {
    const lookup = { lookup: this.lookupStats(visibility, now) };
    if (!this.claimBackfill(guildId, now)) {
      return Promise.resolve(lookup);
    }
    return this.ctx.storage.setAlarm(now).then(() => lookup);
  }

  public phraseTally(channelIds: readonly string[], now: number): PhraseTally {
    return this.tallyPhrases(channelIds, now);
  }

  public phraseExamples(
    phrases: readonly string[],
    channelIds: readonly string[],
  ): readonly PhraseExample[] {
    return this.examplesOf(phrases, channelIds);
  }

  public savePhraseStats(visibility: string, stats: SavedStats): void {
    this.saveStats(visibility, stats);
  }

  public phraseContexts(messageIds: readonly string[]): readonly PhraseContext[] {
    return this.contextsOf(messageIds);
  }

  public unphrased(now: number, limit: number): readonly UnphrasedMessage[] {
    return this.unphrasedMessages(now, limit);
  }

  public writePhrases(extracted: readonly ExtractedPhrases[]): void {
    const erased = new Set(this.erasedAuthors().map(({ id }) => id));
    for (const { message, hashes } of extracted) {
      if (this.markExtracted(message.id) && !erased.has(message.authorId)) {
        this.recordPhrases(message, hashes);
      }
    }
    this.countWrites(extracted.length);
    this.forgetStats();
  }

  public phraseNotes(phrases: readonly string[]): readonly PhraseNote[] {
    return this.notesOf(phrases);
  }

  public claimPhraseNotes(claim: NoteClaim): readonly string[] {
    return this.claimNotes(claim);
  }

  public savePhraseNotes(notes: readonly PhraseNote[], now: number): void {
    this.saveNotes(notes, now);
  }

  public releasePhraseNotes(phrases: readonly string[]): void {
    this.releaseNotes(phrases);
  }

  public vectorCoverage(): Coverage {
    return vectorLedger(this.db).coverage();
  }

  public refreshVectors(): Promise<void> {
    return Effect.runPromise(
      Clock.currentTimeMillis.pipe(Effect.flatMap((now) => this.search.scheduleAt(now))),
    );
  }

  public override alarm(): Promise<void> {
    const { guildId: claimed } = this.ledgerOf();
    const phrases = Option.match(Option.fromNullOr(claimed), {
      onNone: () => Effect.void,
      onSome: (guildId) =>
        backfillPhrases({
          guildId,
          unphrased: (now, limit) => this.unphrased(now, limit),
          writePhrases: (extracted) => {
            this.writePhrases(extracted);
          },
          again: (at) => this.search.scheduleAt(at),
        }),
    });
    const published = phrases.pipe(
      Effect.andThen(this.search.publish()),
      Effect.andThen(this.search.vectors()),
    );
    return Effect.runPromise(published);
  }
}

export { GuildStore };
