import { Clock, Effect, Option } from "effect";

import { erasedAuthors } from "./erased-authors.server";
import { backfillPhrases } from "./phrase-backfill.server";
import { RelationStore } from "./relation-store.server";
import type { ExtractedPhrases, PhraseRequest, PhraseStatsLookup } from "./store-types";
import { vectorLedger } from "./vector-ledger.server";
import type { Coverage } from "./vector-ledger.server";

export class GuildArchive extends RelationStore {
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

  public writePhrases(extracted: readonly ExtractedPhrases[]): void {
    const erased = new Set(erasedAuthors(this.db).ids());
    for (const { message, hashes } of extracted) {
      if (this.markExtracted(message.id) && !erased.has(message.authorId)) {
        this.recordPhrases(message, hashes);
      }
    }
    this.countWrites(extracted.length);
    this.forgetStats();
  }

  public vectorCoverage(): Coverage {
    return vectorLedger(this.db).coverage();
  }

  public refreshVectors(): Promise<void> {
    return this.traced(
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
      Effect.andThen(this.search.publish("due")),
      Effect.andThen(this.search.vectors()),
    );
    return this.traced(published);
  }
}
