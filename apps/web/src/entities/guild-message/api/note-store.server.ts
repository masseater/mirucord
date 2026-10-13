import { and, eq, gte, inArray, ne, or } from "drizzle-orm";
import { Array, Duration, Option } from "effect";

import { phraseNote } from "#/entities/guild-message/model/phrase-note.schema";

import { PhraseStore } from "./phrase-store.server";
import type { NoteClaim, NoteStatus, PhraseColumn, PhraseNote } from "./store-types";

const BOUND_LIMIT = 90;
const EXAMPLE_SEPARATOR = ",";
const NEVER = 0;
const CLAIM_MINUTES = 3;
const CLAIM_MS = Duration.toMillis(Duration.minutes(CLAIM_MINUTES));

const examplesOf = (examples: string): readonly string[] =>
  examples.split(EXAMPLE_SEPARATOR).filter((id) => id.length > NEVER);

const settledOf = (status: NoteStatus): Option.Option<PhraseNote["status"]> =>
  Option.liftPredicate(status, (value): value is PhraseNote["status"] => value !== "pending");

abstract class NoteStore extends PhraseStore {
  protected notesOf(phrases: readonly string[]): readonly PhraseNote[] {
    return Array.chunksOf(phrases, BOUND_LIMIT).flatMap((chunk) =>
      this.db
        .select()
        .from(phraseNote)
        .where(and(inArray(phraseNote.phrase, [...chunk]), ne(phraseNote.status, "pending")))
        .all()
        .flatMap(({ phrase, status, sealed, examples }) =>
          Option.toArray(settledOf(status)).map((settled) => ({
            phrase,
            status: settled,
            sealed,
            examples: examplesOf(examples),
          })),
        ),
    );
  }

  protected claimNotes({ phrases, now }: NoteClaim): readonly string[] {
    const taken = or(
      inArray(phraseNote.status, ["common", "server"]),
      gte(phraseNote.updatedAt, now - CLAIM_MS),
    );
    const settled = new Set(
      Array.chunksOf(phrases, BOUND_LIMIT).flatMap((chunk) =>
        this.db
          .select({ phrase: phraseNote.phrase })
          .from(phraseNote)
          .where(and(inArray(phraseNote.phrase, [...chunk]), taken))
          .all()
          .map(({ phrase }) => phrase),
      ),
    );
    const claimed = phrases.filter((phrase) => !settled.has(phrase));
    for (const phrase of claimed) {
      const pending = {
        status: "pending" as const,
        sealed: Option.getOrNull(Option.none<string>()),
        examples: "",
        updatedAt: now,
      };
      this.db
        .insert(phraseNote)
        .values({ phrase, ...pending })
        .onConflictDoUpdate({ target: phraseNote.phrase, set: pending })
        .run();
    }
    return claimed;
  }

  protected saveNotes(notes: readonly PhraseNote[], now: number): void {
    for (const { phrase, status, sealed, examples } of notes) {
      const note = { status, sealed, examples: examples.join(EXAMPLE_SEPARATOR), updatedAt: now };
      this.db
        .insert(phraseNote)
        .values({ phrase, ...note })
        .onConflictDoUpdate({ target: phraseNote.phrase, set: note })
        .run();
    }
  }

  protected override forgetPhrases(column: PhraseColumn, values: readonly string[]): void {
    super.forgetPhrases(column, values);
    if (column !== "messageId") {
      this.db.delete(phraseNote).where(gte(phraseNote.updatedAt, NEVER)).run();
      return;
    }
    const removed = new Set(values);
    const stale = this.db
      .select({ phrase: phraseNote.phrase, examples: phraseNote.examples })
      .from(phraseNote)
      .all()
      .filter(({ examples }) => examplesOf(examples).some((id) => removed.has(id)))
      .map(({ phrase }) => phrase);
    for (const chunk of Array.chunksOf(stale, BOUND_LIMIT)) {
      this.db
        .delete(phraseNote)
        .where(inArray(phraseNote.phrase, [...chunk]))
        .run();
    }
  }

  protected releaseNotes(phrases: readonly string[]): void {
    for (const chunk of Array.chunksOf(phrases, BOUND_LIMIT)) {
      this.db
        .delete(phraseNote)
        .where(and(inArray(phraseNote.phrase, [...chunk]), eq(phraseNote.status, "pending")))
        .run();
    }
  }
}

export { NoteStore };
