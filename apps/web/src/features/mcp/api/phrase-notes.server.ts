import { DateTime, Effect, Option, pipe } from "effect";
import { fromUint8Array, toUint8Array } from "js-base64";

import { guildStore } from "#/entities/guild-message/index.server";
import type { PhraseNote } from "#/entities/guild-message/index.server";
import { openBytes, sealBytes } from "#/shared/crypto/index.server";

import { annotatePhrase } from "./phrase-annotate.server";
import type { Note, NoteSubject } from "./phrase-annotate.server";
import { preparedOf } from "./phrase-samples.server";
import type { Prepared } from "./phrase-samples.server";

const CONCURRENCY = 6;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type NotesRequest = Readonly<{
  guildId: string;
  key: CryptoKey;
  channelIds: readonly string[];
  subjects: readonly NoteSubject[];
}>;

const contextFor = (guildId: string, phrase: string): string => `phrase-note:${guildId}:${phrase}`;

type Settled = Exclude<Note, Readonly<{ status: "unknown" }>>;

const shownOf = (note: Settled): Option.Option<string> => {
  if (note.status === "common") {
    return Option.none();
  }
  return Option.fromNullOr(note.note);
};

const sealNote = (
  { guildId, key }: NotesRequest,
  phrase: string,
  note: Option.Option<string>,
): Effect.Effect<string | null> =>
  Option.match(note, {
    onNone: () => Effect.succeed(Option.getOrNull(Option.none<string>())),
    onSome: (text) =>
      sealBytes({
        bytes: textEncoder.encode(text),
        key,
        context: contextFor(guildId, phrase),
      }).pipe(Effect.map((sealed) => fromUint8Array(sealed))),
  });

const openNote = (
  { guildId, key }: NotesRequest,
  { phrase, status, sealed }: PhraseNote,
): Effect.Effect<readonly [string, Note]> => {
  if (status === "common") {
    return Effect.succeed([phrase, { status }]);
  }
  return Option.match(Option.fromNullOr(sealed), {
    onNone: () =>
      Effect.succeed([phrase, { status, note: Option.getOrNull(Option.none<string>()) }]),
    onSome: (bytes) =>
      openBytes({ bytes: toUint8Array(bytes), key, context: contextFor(guildId, phrase) }).pipe(
        Effect.map((opened) => [phrase, { status, note: textDecoder.decode(opened) }]),
      ),
  });
};

const storedOf = (
  request: NotesRequest,
  { input, examples }: Prepared,
  note: Settled,
): Effect.Effect<PhraseNote> =>
  sealNote(request, input.phrase, shownOf(note)).pipe(
    Effect.map((sealed) => ({ phrase: input.phrase, status: note.status, sealed, examples })),
  );

const isSettled = (note: Note): note is Settled => note.status !== "unknown";

const generateAll = Effect.fn("generatePhraseNotes")(function* generateAll(
  request: NotesRequest,
  claimed: readonly NoteSubject[],
  now: number,
) {
  const store = guildStore(request.guildId);
  const prepared = yield* preparedOf({ ...request, claimed });
  const generated = yield* Effect.forEach(
    prepared,
    (sample) => annotatePhrase(sample.input).pipe(Effect.map((note) => ({ sample, note }))),
    { concurrency: CONCURRENCY },
  );
  const settled = generated.flatMap(({ sample, note }) =>
    Option.toArray(pipe(note, Option.filter(isSettled))).map((value) => ({ sample, note: value })),
  );
  const stored = yield* pipe(
    settled,
    Effect.forEach(({ sample, note }) => storedOf(request, sample, note)),
  );
  const failed = generated
    .filter(({ note }) => Option.isNone(note))
    .map(({ sample }) => sample.input.phrase);
  yield* Effect.promise(() =>
    Promise.all([store.savePhraseNotes(stored, now), store.releasePhraseNotes(failed)]),
  );
  return settled.map(({ sample, note }): readonly [string, Note] => [sample.input.phrase, note]);
});

const phraseNotesOf = Effect.fn("phraseNotes")(function* phraseNotes(request: NotesRequest) {
  const store = guildStore(request.guildId);
  const phrases = request.subjects.map(({ phrase }) => phrase);
  const existing = yield* Effect.promise(() => store.phraseNotes(phrases));
  const opened = yield* pipe(
    existing,
    Effect.forEach((note) => openNote(request, note)),
  );
  const known = new Set(existing.map(({ phrase }) => phrase));
  const now = DateTime.toEpochMillis(yield* DateTime.now);
  const claimed = new Set(
    yield* Effect.promise(() =>
      store.claimPhraseNotes({ phrases: phrases.filter((phrase) => !known.has(phrase)), now }),
    ),
  );
  const generated = yield* generateAll(
    request,
    request.subjects.filter(({ phrase }) => claimed.has(phrase)),
    now,
  );
  return new Map<string, Note>([...opened, ...generated]);
});

export { phraseNotesOf };
export type { NotesRequest };
