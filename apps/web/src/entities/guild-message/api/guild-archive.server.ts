import { Array, Clock, Effect, Option, pipe } from "effect";

import { erasedAuthors } from "./erased-authors.server.ts";
import { backfillPhrases } from "./phrase-backfill.server.ts";
import { RelationStore } from "./relation-store.server.ts";
import type { ExtractedPhrases, PhraseRequest, PhraseStatsLookup } from "./store-types.ts";
import { vectorLedger } from "./vector-ledger.server.ts";
import type { Coverage } from "./vector-ledger.server.ts";

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
    const marked = this.markExtracted(
      pipe(
        extracted,
        Array.map(({ message }) => message.id),
      ),
    );
    this.recordPhrases(
      pipe(
        extracted,
        Array.filter(({ message }) => marked.has(message.id) && !erased.has(message.authorId)),
      ),
    );
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
