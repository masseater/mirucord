import { Array, DateTime, Effect, Option, pipe, Record } from "effect";

import { guildStore, labelOf, PHRASE_WINDOW_DAYS } from "#/entities/guild-message/index.server";
import type { Phrase, PhraseKind } from "#/entities/guild-message/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { openGuildKey, openMessage, openSearchKey } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

import { excerptOf } from "./phrase-annotate.server";
import type { Note, NoteSubject } from "./phrase-annotate.server";
import { phraseNotesOf } from "./phrase-notes.server";
import { phraseStatsOf } from "./phrase-stats.server";
import type { StoredPhrase, StoredStats } from "./phrase-stats.server";

export type PhraseView = Readonly<{
  kind: PhraseKind;
  phrase: string;
  uses: number;
  people: number;
  lastUsedAt: string;
  channels: readonly Readonly<{ id: string; name: string }>[];
  examples: readonly (readonly string[])[];
  note: string | null;
}>;

export type ServerPhrases = Readonly<{ days: number; phrases: readonly PhraseView[] }>;

export type PhrasesRequest = Readonly<{ scope: GuildScope; channelIds: readonly string[] }>;

type Example = Readonly<{ message: MessageBody; context: readonly MessageBody[] }>;

type Labelled = Readonly<{ view: Omit<PhraseView, "note">; input: NoteSubject }>;

const openExamples = Effect.fn("openPhraseExamples")(function* open(
  scope: GuildScope,
  stats: StoredStats,
) {
  const { guildId, wrappedKey } = scope.guild;
  const key = yield* openGuildKey(wrappedKey);
  const contexts = yield* Effect.promise(() =>
    guildStore(guildId).phraseContexts(
      pipe(
        stats.phrases,
        Array.flatMap(({ examples }) => examples),
      ),
    ),
  );
  const opened = yield* Effect.forEach(
    contexts,
    ({ messageId, messages }) =>
      Effect.forEach(
        messages,
        (message) =>
          openMessage(message.sealed, key, {
            guildId,
            channelId: message.channelId,
            messageId: message.id,
          }),
        { concurrency: 1 },
      ).pipe(
        Effect.map((bodies) =>
          Array.matchRight(bodies, {
            onEmpty: () => [],
            onNonEmpty: (context, message): readonly (readonly [string, Example])[] => [
              [messageId, { message, context: [...context, message] }],
            ],
          }),
        ),
      ),
    { concurrency: 1 },
  );
  return Record.fromEntries(opened.flat());
});

const channelsOf = (
  scope: GuildScope,
  stored: StoredPhrase,
): readonly Readonly<{ id: string; name: string }>[] => {
  const names = Record.fromEntries(
    pipe(
      scope.guild.channels,
      Array.map(({ id, name }) => [id, name]),
    ),
  );
  return pipe(
    stored.channels,
    Array.map(({ channelId }) => ({
      id: channelId,
      name: Option.getOrElse(Record.get(names, channelId), () => channelId),
    })),
  );
};

const viewOf =
  (
    scope: GuildScope,
    searchKey: CryptoKey,
    examples: Readonly<Record<string, Example>>,
  ): ((stored: StoredPhrase) => Effect.Effect<Option.Option<Labelled>>) =>
  (stored) => {
    const found = pipe(
      stored.examples,
      Array.flatMap((id) => Option.toArray(Record.get(examples, id))),
    );
    const channels = channelsOf(scope, stored);
    const excerpts = pipe(
      found,
      Array.map(({ context }) => pipe(context, Array.map(excerptOf))),
    );
    const labelled: Effect.Effect<Option.Option<Phrase>> = Option.match(Array.head(found), {
      onNone: () => Effect.succeedNone,
      onSome: ({ message }) => labelOf({ searchKey, source: message, phrase: stored.phrase }),
    });
    return labelled.pipe(
      Effect.map(
        Option.map((phrase) => ({
          view: {
            kind: phrase.kind,
            phrase: phrase.label,
            uses: stored.uses,
            people: stored.people,
            lastUsedAt: DateTime.formatIso(DateTime.makeUnsafe(stored.lastUsedAt)),
            channels,
            examples: excerpts,
          },
          input: {
            phrase: stored.phrase,
            label: phrase,
            uses: stored.uses,
            people: stored.people,
          },
        })),
      ),
    );
  };

const NO_NOTE = Option.getOrNull(Option.none<string>());

const withNote = (view: Labelled["view"], note: string | null): PhraseView => ({ ...view, note });

const noteView = (note: Option.Option<Note>): Option.Option<string | null> =>
  Option.match(note, {
    onNone: () => Option.some(NO_NOTE),
    onSome: (found) => {
      if (found.status === "common") {
        return Option.none();
      }
      if (found.status === "server") {
        return Option.some(found.note);
      }
      return Option.some(NO_NOTE);
    },
  });

const viewsOf = Effect.fn("phraseViews")(function* views(
  { scope, channelIds }: PhrasesRequest,
  stats: StoredStats,
) {
  const searchKey = yield* openSearchKey(scope.guild.wrappedKey);
  const examples = yield* openExamples(scope, stats);
  const found = yield* Effect.forEach(stats.phrases, viewOf(scope, searchKey, examples), {
    concurrency: 1,
  });
  const labelled = Array.getSomes(found);
  const notes = yield* phraseNotesOf({
    guildId: scope.guild.guildId,
    key: yield* openGuildKey(scope.guild.wrappedKey),
    channelIds,
    subjects: pipe(
      labelled,
      Array.map(({ input }) => input),
    ),
  });
  const noteOf = (phrase: string): Option.Option<string | null> =>
    noteView(Option.fromUndefinedOr(notes.get(phrase)));
  return pipe(
    labelled,
    Array.flatMap(({ view, input }) =>
      pipe(
        Option.toArray(noteOf(input.phrase)),
        Array.map((note) => withNote(view, note)),
      ),
    ),
  );
});

export const serverPhrases = ({
  scope,
  channelIds,
}: PhrasesRequest): Effect.Effect<ServerPhrases> => {
  if (scope.guild.consent !== "consented") {
    return Effect.succeed({ days: PHRASE_WINDOW_DAYS, phrases: [] });
  }
  return phraseStatsOf({ guildId: scope.guild.guildId, channelIds }).pipe(
    Effect.flatMap((stats) => viewsOf({ scope, channelIds }, stats)),
    Effect.map((phrases) => ({ days: PHRASE_WINDOW_DAYS, phrases })),
  );
};
