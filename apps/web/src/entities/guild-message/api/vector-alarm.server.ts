import { Boolean, Clock, Effect, Match, Option } from "effect";

import { openGuildKey } from "#/shared/crypto/index.server";

import { FLUSH_DELAY_MS, scheduleSearch } from "./search-alarm.server";
import type { Published } from "./search-alarm.server";
import { embedPending } from "./vector-embed.server";
import type { EmbedOutcome } from "./vector-embed.server";
import { publishVectors } from "./vector-publish.server";
import { wrappedKeyOf } from "./wrapped-key.server";

const NO_DELAY = 0;

type Followup = Readonly<{ embedded: EmbedOutcome; publishedMore: boolean }>;

const delayOf = ({ embedded, publishedMore }: Followup, now: number): Option.Option<number> =>
  Match.value(embedded).pipe(
    Match.discriminatorsExhaustive("status")({
      more: () => Option.some(NO_DELAY),
      waiting: ({ until }) =>
        Option.some(Math.max(NO_DELAY, until - now)).pipe(
          Option.map((delay) =>
            Boolean.match(publishedMore, { onTrue: () => NO_DELAY, onFalse: () => delay }),
          ),
        ),
      done: () => Option.some(NO_DELAY).pipe(Option.filter(() => publishedMore)),
    }),
  );

const retryLater = (cause: unknown): Effect.Effect<EmbedOutcome> =>
  Effect.logWarning("Embedding failed; retrying later").pipe(
    Effect.annotateLogs({ cause: String(cause) }),
    Effect.andThen(Clock.currentTimeMillis),
    Effect.map((now) => ({ status: "waiting", until: now + FLUSH_DELAY_MS })),
  );

const vectorsWithKey = (published: Published, key: CryptoKey): Effect.Effect<void> => {
  const keys = { guildId: published.guildId, key };
  return embedPending({ db: published.db, keys }).pipe(
    Effect.catchTag("EmbeddingError", ({ cause }) => retryLater(cause)),
    Effect.flatMap((embedded) =>
      publishVectors({ db: published.db, bucket: published.bucket, keys }).pipe(
        Effect.map(({ status }) => ({ embedded, publishedMore: status === "more" })),
      ),
    ),
    Effect.flatMap((followup) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          Option.match(delayOf(followup, now), {
            onNone: () => Effect.void,
            onSome: (delay) => scheduleSearch({ ...published, delay }),
          }),
        ),
      ),
    ),
  );
};

const publishGuildVectors = (published: Published): Effect.Effect<void> =>
  wrappedKeyOf(published.guildId).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (wrappedKey) =>
          openGuildKey(wrappedKey).pipe(Effect.flatMap((key) => vectorsWithKey(published, key))),
      }),
    ),
    Effect.withSpan("vectors.alarm", { attributes: { guildId: published.guildId } }),
  );

export { publishGuildVectors };
