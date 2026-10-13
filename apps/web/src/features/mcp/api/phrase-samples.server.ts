import { Effect, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { NoteSample, SealedMessage } from "#/entities/guild-message/index.server";
import { openMessage } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

import type { NoteInput, NoteSubject, OpenedSample } from "./phrase-annotate.server";

type Prepared = Readonly<{ input: NoteInput; examples: readonly string[] }>;

type SamplesRequest = Readonly<{
  guildId: string;
  key: CryptoKey;
  channelIds: readonly string[];
  claimed: readonly NoteSubject[];
}>;

const idsOf = ({ before, use, after }: NoteSample): readonly string[] =>
  [...before, use, ...after].map(({ id }) => id);

const preparedOf = Effect.fn("preparePhraseSamples")(function* prepare({
  guildId,
  key,
  channelIds,
  claimed,
}: SamplesRequest) {
  const open = (message: SealedMessage): Effect.Effect<MessageBody> =>
    openMessage(message.sealed, key, {
      guildId,
      channelId: message.channelId,
      messageId: message.id,
    });
  const openAll = (messages: readonly SealedMessage[]): Effect.Effect<readonly MessageBody[]> =>
    pipe(messages, Effect.forEach(open));
  const openSample = ({ before, use, after }: NoteSample): Effect.Effect<OpenedSample> =>
    Effect.all({ before: openAll(before), use: open(use), after: openAll(after) });
  const found = yield* Effect.promise(() =>
    guildStore(guildId).phraseSamples({
      phrases: claimed.map(({ phrase }) => phrase),
      channelIds,
    }),
  );
  const samplesOf = new Map(found.map(({ phrase, samples }) => [phrase, samples]));
  return yield* pipe(
    claimed,
    Effect.forEach((subject) => {
      const samples = samplesOf.get(subject.phrase) ?? [];
      return pipe(
        samples,
        Effect.forEach(openSample),
        Effect.map((opened): Prepared => ({
          input: { ...subject, samples: opened },
          examples: samples.flatMap((sample) => idsOf(sample)),
        })),
      );
    }),
  );
});

export { preparedOf };
export type { Prepared, SamplesRequest };
