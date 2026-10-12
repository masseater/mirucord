import { Effect, Option } from "effect";

import { backfillPhrases } from "./phrase-backfill.server";
import { PhraseStore } from "./phrase-store.server";
import type {
  ExtractedPhrases,
  PhraseContext,
  PhraseExample,
  PhraseRequest,
  PhraseStatsLookup,
  PhraseTally,
  SavedStats,
  UnphrasedMessage,
} from "./store-types";

class GuildStore extends PhraseStore {
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
    const published = phrases.pipe(Effect.andThen(this.search.publish()));
    return Effect.runPromise(published);
  }
}

export { GuildStore };
