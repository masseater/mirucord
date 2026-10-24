import { count, countDistinct, eq, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, Number, Option, Order, pipe, Record, Schema } from "effect";
import { Hex } from "effect/encoding";

import { guildStore } from "#/entities/guild-message/index.server";
import type { PhraseCandidate } from "#/entities/guild-message/index.server";
import { commonPhrase, db } from "#/shared/db/index.server";

const TOP_PHRASES = 30;
const ROWS_PER_INSERT = 50;
const BOUND_LIMIT = 90;
const NO_GUILDS = 0;
const ONE_GUILD = 1;
const CHANNEL_SEPARATOR = ",";

const StoredPhraseSchema = Schema.Struct({
  phrase: Schema.String,
  uses: Schema.Int,
  people: Schema.Int,
  lastUsedAt: Schema.Finite,
  channels: Schema.Array(Schema.Struct({ channelId: Schema.String, uses: Schema.Int })),
  examples: Schema.Array(Schema.String),
});
const StoredStatsSchema = Schema.fromJsonString(
  Schema.Struct({ phrases: Schema.Array(StoredPhraseSchema) }),
);
const decodeStats = Schema.decodeEffect(StoredStatsSchema);
const encodeStats = Schema.encodeEffect(StoredStatsSchema);

type StoredStats = typeof StoredStatsSchema.Type;
type StoredPhrase = typeof StoredPhraseSchema.Type;
type StatsRequest = Readonly<{ guildId: string; channelIds: readonly string[] }>;
type Tallied = Readonly<{ stats: StoredStats; written: number; generation: number }>;

const textEncoder = new TextEncoder();

const visibilityOf = (channelIds: readonly string[]): Effect.Effect<string> =>
  Effect.promise(() => {
    const joined = Array.join(Array.sort(channelIds, Order.String), CHANNEL_SEPARATOR);
    return crypto.subtle.digest("SHA-256", textEncoder.encode(joined));
  }).pipe(Effect.map((digest) => Hex.encode(new Uint8Array(digest))));

const replacePresence = ({
  guildId,
  presence,
}: Readonly<{ guildId: string; presence: readonly string[] }>): Effect.Effect<void> =>
  Effect.promise(() =>
    db.batch([
      db.delete(commonPhrase).where(eq(commonPhrase.guildId, guildId)),
      ...pipe(
        Array.chunksOf(presence, ROWS_PER_INSERT),
        Array.map((chunk) =>
          db
            .insert(commonPhrase)
            .values(
              pipe(
                chunk,
                Array.map((phrase) => ({ phrase, guildId })),
              ),
            )
            .onConflictDoNothing(),
        ),
      ),
    ]),
  );

const guildsWithPhrases: Effect.Effect<number> = Effect.promise(() =>
  db.select({ guilds: countDistinct(commonPhrase.guildId) }).from(commonPhrase),
).pipe(
  Effect.map((rows) =>
    Option.getOrElse(
      Option.map(Array.head(rows), ({ guilds }) => guilds),
      () => NO_GUILDS,
    ),
  ),
);

const guildsUsing = (commons: readonly string[]): Effect.Effect<Readonly<Record<string, number>>> =>
  Effect.forEach(Array.chunksOf(commons, BOUND_LIMIT), (chunk) =>
    Effect.promise(() =>
      db
        .select({ phrase: commonPhrase.phrase, guilds: count() })
        .from(commonPhrase)
        .where(inArray(commonPhrase.phrase, [...chunk]))
        .groupBy(commonPhrase.phrase),
    ),
  ).pipe(
    Effect.map((rows) =>
      Record.fromEntries(
        pipe(
          rows.flat(),
          Array.map(({ phrase, guilds }) => [phrase, guilds]),
        ),
      ),
    ),
  );

type Rarity = Readonly<{ guilds: number; using: Readonly<Record<string, number>> }>;

const scoreOf = ({ guilds, using }: Rarity, { uses, common }: PhraseCandidate): number => {
  const sharing = Option.getOrElse(Record.get(using, common), () => ONE_GUILD);
  return uses * Math.log((guilds + ONE_GUILD) / Number.max(sharing, ONE_GUILD));
};

const byScoreDescending = Order.flip(
  Order.mapInput(Order.Number, ({ score }: Readonly<{ score: number }>) => score),
);

const rank = (candidates: readonly PhraseCandidate[], rarity: Rarity): readonly PhraseCandidate[] =>
  pipe(
    candidates,
    Array.map((candidate) => ({ candidate, score: scoreOf(rarity, candidate) })),
    (rows) => Array.sort(rows, byScoreDescending),
    Array.take(TOP_PHRASES),
    Array.map(({ candidate }) => candidate),
  );

const rankedCandidates = Effect.fn("rankPhrases")(function* ranked(
  guildId: string,
  tally: Readonly<{ candidates: readonly PhraseCandidate[]; presence: readonly string[] }>,
) {
  yield* replacePresence({ guildId, presence: tally.presence });
  const guilds = yield* guildsWithPhrases;
  const using = yield* guildsUsing(
    pipe(
      tally.candidates,
      Array.map(({ common }) => common),
    ),
  );
  yield* Effect.annotateCurrentSpan({ guildId, candidates: tally.candidates.length, guilds });
  return rank(tally.candidates, { guilds, using });
});

const tallyStats = Effect.fn("tallyPhraseStats")(function* tally(
  { guildId, channelIds }: StatsRequest,
  now: number,
) {
  const store = guildStore(guildId);
  const tallied = yield* Effect.promise(() => store.phraseTally(channelIds, now));
  const ranked = yield* rankedCandidates(guildId, tallied);
  const examples = yield* Effect.promise(() =>
    store.phraseExamples(
      pipe(
        ranked,
        Array.map(({ phrase }) => phrase),
      ),
      channelIds,
    ),
  );
  const examplesOf = Record.fromEntries(
    pipe(
      examples,
      Array.map(({ phrase, messageIds }) => [phrase, messageIds]),
    ),
  );
  const phrases = pipe(
    ranked,
    Array.map(({ phrase, uses, people, lastUsedAt, channels }): StoredPhrase => ({
      phrase,
      uses,
      people,
      lastUsedAt,
      channels,
      examples: Option.getOrElse(Record.get(examplesOf, phrase), () => []),
    })),
  );
  return {
    stats: { phrases },
    written: tallied.written,
    generation: tallied.generation,
  } satisfies Tallied;
});

const saveTallied = (
  { guildId, visibility, now }: Readonly<{ guildId: string; visibility: string; now: number }>,
  { stats, written, generation }: Tallied,
): Effect.Effect<StoredStats> =>
  encodeStats(stats).pipe(
    Effect.orDie,
    Effect.flatMap((body) =>
      Effect.promise(() =>
        guildStore(guildId).savePhraseStats(visibility, {
          body,
          written,
          generation,
          computedAt: now,
        }),
      ),
    ),
    Effect.as(stats),
  );

const phraseStatsOf = Effect.fn("phraseStats")(function* stats(request: StatsRequest) {
  const now = DateTime.toEpochMillis(yield* DateTime.now);
  const visibility = yield* visibilityOf(request.channelIds);
  const { lookup } = yield* Effect.promise(() =>
    guildStore(request.guildId).phraseStats({ guildId: request.guildId, visibility, now }),
  );
  if (lookup.status === "fresh") {
    return yield* decodeStats(lookup.body).pipe(Effect.orDie);
  }
  const tallied = yield* tallyStats(request, now);
  return yield* saveTallied({ guildId: request.guildId, visibility, now }, tallied);
});

export { phraseStatsOf };
export type { StatsRequest, StoredPhrase, StoredStats };
