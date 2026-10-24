import { and, asc, desc, eq, gt, gte, inArray, lt, ne, or } from "drizzle-orm";
import { Array, Duration, Option, pipe } from "effect";

import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { phraseNote } from "#/entities/guild-message/model/phrase-note.schema";
import { phraseUse } from "#/entities/guild-message/model/phrase-use.schema";

import { SEALED_COLUMNS } from "./message-store.server";
import { PhraseStore } from "./phrase-store.server";
import type {
  NoteClaim,
  NoteSample,
  NoteStatus,
  PhraseColumn,
  PhraseNote,
  PhraseSamples,
  SampleRequest,
  SealedMessage,
} from "./store-types";

const BOUND_LIMIT = 90;
const EXAMPLE_SEPARATOR = ",";
const NEVER = 0;
const CLAIM_MINUTES = 3;
const CLAIM_MS = Duration.toMillis(Duration.minutes(CLAIM_MINUTES));
const FIRST = 0;
const SAMPLES_PER_PHRASE = 6;
const SAMPLE_SCAN = 60;
const AROUND = 2;

type Use = Readonly<{ messageId: string; channelId: string; authorId: string }>;

const spreadOf = (uses: readonly Use[]): readonly Use[] => {
  const distinct = Array.dedupeWith(uses, (left, right) => left.authorId === right.authorId);
  const picked = new Set(
    pipe(
      distinct,
      Array.map(({ messageId }) => messageId),
    ),
  );
  return [
    ...distinct,
    ...pipe(
      uses,
      Array.filter(({ messageId }) => !picked.has(messageId)),
    ),
  ].slice(FIRST, SAMPLES_PER_PHRASE);
};

const examplesOf = (examples: string): readonly string[] =>
  pipe(
    examples.split(EXAMPLE_SEPARATOR),
    Array.filter((id) => id.length > NEVER),
  );

const settledOf = (status: NoteStatus): Option.Option<PhraseNote["status"]> =>
  Option.liftPredicate(status, (value): value is PhraseNote["status"] => value !== "pending");

abstract class NoteStore extends PhraseStore {
  protected notesOf(phrases: readonly string[]): readonly PhraseNote[] {
    return pipe(
      Array.chunksOf(phrases, BOUND_LIMIT),
      Array.flatMap((chunk) => {
        const rows = this.db
          .select()
          .from(phraseNote)
          .where(and(inArray(phraseNote.phrase, [...chunk]), ne(phraseNote.status, "pending")))
          .all();
        return pipe(
          rows,
          Array.flatMap(({ phrase, status, sealed, examples }) =>
            pipe(
              Option.toArray(settledOf(status)),
              Array.map((settled) => ({
                phrase,
                status: settled,
                sealed,
                examples: examplesOf(examples),
              })),
            ),
          ),
        );
      }),
    );
  }

  protected claimNotes({ phrases, now }: NoteClaim): readonly string[] {
    const taken = or(
      inArray(phraseNote.status, ["common", "server"]),
      gte(phraseNote.updatedAt, now - CLAIM_MS),
    );
    const settled = new Set(
      pipe(
        Array.chunksOf(phrases, BOUND_LIMIT),
        Array.flatMap((chunk) => {
          const rows = this.db
            .select({ phrase: phraseNote.phrase })
            .from(phraseNote)
            .where(and(inArray(phraseNote.phrase, [...chunk]), taken))
            .all();
          return pipe(
            rows,
            Array.map(({ phrase }) => phrase),
          );
        }),
      ),
    );
    const claimed = pipe(
      phrases,
      Array.filter((phrase) => !settled.has(phrase)),
    );
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
      const note = {
        status,
        sealed,
        examples: pipe(examples, Array.join(EXAMPLE_SEPARATOR)),
        updatedAt: now,
      };
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
    const stale = pipe(
      this.db
        .select({ phrase: phraseNote.phrase, examples: phraseNote.examples })
        .from(phraseNote)
        .all(),
      Array.filter(({ examples }) =>
        pipe(
          examplesOf(examples),
          Array.some((id) => removed.has(id)),
        ),
      ),
      Array.map(({ phrase }) => phrase),
    );
    for (const chunk of Array.chunksOf(stale, BOUND_LIMIT)) {
      this.db
        .delete(phraseNote)
        .where(inArray(phraseNote.phrase, [...chunk]))
        .run();
    }
  }

  protected samplesOf({ phrases, channelIds }: SampleRequest): readonly PhraseSamples[] {
    const channels = new Set(channelIds);
    return pipe(
      phrases,
      Array.map((phrase) => {
        const uses = this.db
          .select({
            messageId: phraseUse.messageId,
            channelId: phraseUse.channelId,
            authorId: phraseUse.authorId,
          })
          .from(phraseUse)
          .where(eq(phraseUse.phrase, phrase))
          .orderBy(desc(phraseUse.createdAt))
          .limit(SAMPLE_SCAN)
          .all();
        const samples = pipe(
          uses,
          Array.filter(({ channelId }) => channels.has(channelId)),
          spreadOf,
          Array.flatMap(({ messageId }) => Option.toArray(this.sampleAround(messageId))),
        );
        return { phrase, samples };
      }),
    );
  }

  private sampleAround(messageId: string): Option.Option<NoteSample> {
    return Option.fromUndefinedOr(
      this.db.select(SEALED_COLUMNS).from(guildMessage).where(eq(guildMessage.id, messageId)).get(),
    ).pipe(
      Option.map((use) => ({
        before: pipe(this.neighbours(use, "before"), Array.reverse),
        use,
        after: this.neighbours(use, "after"),
      })),
    );
  }

  private neighbours(use: SealedMessage, side: "before" | "after"): readonly SealedMessage[] {
    const sameChannel = eq(guildMessage.channelId, use.channelId);
    if (side === "before") {
      return this.db
        .select(SEALED_COLUMNS)
        .from(guildMessage)
        .where(and(sameChannel, lt(guildMessage.createdAt, use.createdAt)))
        .orderBy(desc(guildMessage.createdAt))
        .limit(AROUND)
        .all();
    }
    return this.db
      .select(SEALED_COLUMNS)
      .from(guildMessage)
      .where(and(sameChannel, gt(guildMessage.createdAt, use.createdAt)))
      .orderBy(asc(guildMessage.createdAt))
      .limit(AROUND)
      .all();
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
