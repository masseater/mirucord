import { Array, DateTime, Effect, Option, Record, pipe } from "effect";

import { guildStore, labelOf, PHRASE_WINDOW_DAYS } from "#/entities/guild-message/index.server";
import type { Phrase, PhraseKind } from "#/entities/guild-message/index.server";
import { openGuildKey, openMessage, openSearchKey } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

import { excerptOf } from "./phrase-annotate.server";
import type { Note, NoteInput } from "./phrase-annotate.server";
import { phraseNotesOf } from "./phrase-notes.server";
import { phraseStatsOf } from "./phrase-stats.server";
import type { StoredPhrase, StoredStats } from "./phrase-stats.server";
import type { GuildScope } from "./scope.server";

type PhraseView = Readonly<{
  kind: PhraseKind;
  phrase: string;
  uses: number;
  people: number;
  lastUsedAt: string;
  channels: readonly Readonly<{ id: string; name: string }>[];
  examples: readonly (readonly string[])[];
  note: string | null;
}>;

type ServerPhrases = Readonly<{ days: number; phrases: readonly PhraseView[] }>;

type PhrasesRequest = Readonly<{ scope: GuildScope; channelIds: readonly string[] }>;

type Example = Readonly<{ message: MessageBody; context: readonly MessageBody[] }>;

type Labelled = Readonly<{ view: Omit<PhraseView, "note">; input: NoteInput }>;

const openExamples = Effect.fn("openPhraseExamples")(function* open(
  scope: GuildScope,
  stats: StoredStats,
) {
  const { guildId, wrappedKey } = scope.guild;
  const key = yield* openGuildKey(wrappedKey);
  const contexts = yield* Effect.promise(() =>
    guildStore(guildId).phraseContexts(stats.phrases.flatMap(({ examples }) => examples)),
  );
  const opened = yield* pipe(
    contexts,
    Effect.forEach(({ messageId, messages }) =>
      pipe(
        messages,
        Effect.forEach((message) =>
          openMessage(message.sealed, key, {
            guildId,
            channelId: message.channelId,
            messageId: message.id,
          }),
        ),
        Effect.map((bodies) =>
          Array.matchRight(bodies, {
            onEmpty: () => [],
            onNonEmpty: (context, message): readonly (readonly [string, Example])[] => [
              [messageId, { message, context: [...context, message] }],
            ],
          }),
        ),
      ),
    ),
  );
  return Object.fromEntries(opened.flat());
});

const viewOf =
  (
    scope: GuildScope,
    searchKey: CryptoKey,
    examples: Readonly<Record<string, Example>>,
  ): ((stored: StoredPhrase) => Effect.Effect<Option.Option<Labelled>>) =>
  (stored) => {
    const found = stored.examples.flatMap((id) => Option.toArray(Record.get(examples, id)));
    const names = Object.fromEntries(scope.guild.channels.map(({ id, name }) => [id, name]));
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
            channels: stored.channels.map(({ channelId }) => ({
              id: channelId,
              name: Option.getOrElse(Record.get(names, channelId), () => channelId),
            })),
            examples: found.map(({ context }) => context.map((body) => excerptOf(body))),
          },
          input: {
            phrase: stored.phrase,
            label: phrase,
            uses: stored.uses,
            people: stored.people,
            examples: stored.examples,
            contexts: found.map(({ context }) => context),
          },
        })),
      ),
    );
  };

const withNote = (view: Labelled["view"], note: string | null): PhraseView => ({ ...view, note });

const noteView = (note: Option.Option<Note>): Option.Option<string | null> =>
  Option.match(note, {
    onNone: () => Option.some(Option.getOrNull(Option.none<string>())),
    onSome: (found) => {
      if (found.status === "common") {
        return Option.none();
      }
      if (found.status === "server") {
        return Option.some(found.note);
      }
      return Option.some(Option.getOrNull(Option.none<string>()));
    },
  });

const viewsOf = Effect.fn("phraseViews")(function* views(scope: GuildScope, stats: StoredStats) {
  const searchKey = yield* openSearchKey(scope.guild.wrappedKey);
  const examples = yield* openExamples(scope, stats);
  const found = yield* pipe(stats.phrases, Effect.forEach(viewOf(scope, searchKey, examples)));
  const labelled = Array.getSomes(found);
  const notes = yield* phraseNotesOf({
    guildId: scope.guild.guildId,
    key: yield* openGuildKey(scope.guild.wrappedKey),
    inputs: labelled.map(({ input }) => input),
  });
  const noteOf = (phrase: string): Option.Option<string | null> =>
    noteView(Option.fromUndefinedOr(notes.get(phrase)));
  return labelled.flatMap(({ view, input }) =>
    Option.toArray(noteOf(input.phrase)).map((note) => withNote(view, note)),
  );
});

const serverPhrases = ({ scope, channelIds }: PhrasesRequest): Effect.Effect<ServerPhrases> => {
  if (scope.guild.consent !== "consented") {
    return Effect.succeed({ days: PHRASE_WINDOW_DAYS, phrases: [] });
  }
  return phraseStatsOf({ guildId: scope.guild.guildId, channelIds }).pipe(
    Effect.flatMap((stats) => viewsOf(scope, stats)),
    Effect.map((phrases) => ({ days: PHRASE_WINDOW_DAYS, phrases })),
  );
};

const PHRASES_DESCRIPTION = `List the short phrases, custom emoji and stickers that at least three members of a server used in the last ${PHRASE_WINDOW_DAYS} days, ranked by how often they appear here and how rarely in other servers. Everyday words that any server uses are left out. Each carries how many times and by how many people it was used, the channels it shows up in, examples with the message before it, and note, an AI-written line on how this server uses it (null when not written yet). Treat them as the server's own vocabulary: when you meet one while reading messages, it is a greeting, reaction or in-joke rather than news.`;

export { PHRASES_DESCRIPTION, serverPhrases };
export type { PhrasesRequest, PhraseView, ServerPhrases };
