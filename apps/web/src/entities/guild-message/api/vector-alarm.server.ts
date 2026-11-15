import { Boolean, Clock, Effect, Match, Option } from "effect";

import { FLUSH_DELAY_MS } from "#/entities/guild-message/lib/search-layout";
import { openGuildKey } from "#/shared/crypto/index.server";

import { scheduleSearch } from "./search-alarm.server";
import type { PublishTarget } from "./search-alarm.server";
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

const vectorsWithKey = (target: PublishTarget, key: CryptoKey): Effect.Effect<void> => {
  const keys = { guildId: target.guildId, key };
  return embedPending({ db: target.db, keys }).pipe(
    Effect.catchTag("EmbeddingError", ({ cause }) => retryLater(cause)),
    Effect.flatMap((embedded) =>
      publishVectors({ db: target.db, bucket: target.bucket, keys }).pipe(
        Effect.map(({ status }) => ({ embedded, publishedMore: status === "more" })),
      ),
    ),
    Effect.flatMap((followup) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          Option.match(delayOf(followup, now), {
            onNone: () => Effect.void,
            onSome: (delay) => scheduleSearch({ ...target, delay }),
          }),
        ),
      ),
    ),
  );
};

const publishGuildVectors = (target: PublishTarget): Effect.Effect<void> =>
  wrappedKeyOf(target.guildId).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (wrappedKey) =>
          openGuildKey(wrappedKey).pipe(Effect.flatMap((key) => vectorsWithKey(target, key))),
      }),
    ),
    Effect.withSpan("vectors.alarm", { attributes: { guildId: target.guildId } }),
  );

export { publishGuildVectors };
