import { Array, Effect, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { NoteSample, SealedMessage } from "#/entities/guild-message/index.server";
import { openMessage } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

import type { NoteInput, NoteSubject, OpenedSample } from "./phrase-annotate.server.ts";

export type Prepared = Readonly<{ input: NoteInput; examples: readonly string[] }>;

export type SamplesRequest = Readonly<{
  guildId: string;
  key: CryptoKey;
  channelIds: readonly string[];
  claimed: readonly NoteSubject[];
}>;

const idsOf = ({ before, use, after }: NoteSample): readonly string[] =>
  pipe(
    [...before, use, ...after],
    Array.map(({ id }) => id),
  );

const sampleOpener = ({
  guildId,
  key,
}: Readonly<Pick<SamplesRequest, "guildId" | "key">>): ((
  sample: NoteSample,
) => Effect.Effect<OpenedSample>) => {
  const open = (message: SealedMessage): Effect.Effect<MessageBody> =>
    openMessage(message.sealed, key, {
      guildId,
      channelId: message.channelId,
      messageId: message.id,
    });
  const openAll = (messages: readonly SealedMessage[]): Effect.Effect<readonly MessageBody[]> =>
    Effect.forEach(messages, open, { concurrency: 1 });
  return ({ before, use, after }) =>
    Effect.all(
      { before: openAll(before), use: open(use), after: openAll(after) },
      { concurrency: 1 },
    );
};

export const preparedOf = Effect.fn("preparePhraseSamples")(function* prepare({
  guildId,
  key,
  channelIds,
  claimed,
}: SamplesRequest) {
  const openSample = sampleOpener({ guildId, key });
  const found = yield* Effect.promise(() =>
    guildStore(guildId).phraseSamples({
      phrases: pipe(
        claimed,
        Array.map(({ phrase }) => phrase),
      ),
      channelIds,
    }),
  );
  const samplesOf = new Map(
    pipe(
      found,
      Array.map(({ phrase, samples }) => [phrase, samples]),
    ),
  );
  return yield* Effect.forEach(
    claimed,
    (subject) => {
      const samples = samplesOf.get(subject.phrase) ?? [];
      return Effect.forEach(samples, openSample, { concurrency: 1 }).pipe(
        Effect.map((opened): Prepared => ({
          input: { ...subject, samples: opened },
          examples: pipe(
            samples,
            Array.flatMap((sample) => idsOf(sample)),
          ),
        })),
      );
    },
    { concurrency: 1 },
  );
});
