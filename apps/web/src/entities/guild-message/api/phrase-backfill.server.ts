import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { phraseHashes } from "#/entities/guild-message/lib/phrases.server";
import { openGuildKeys, openMessage } from "#/shared/crypto/index.server";
import { db, guild } from "#/shared/db/index.server";

import type { ExtractedPhrases, UnphrasedMessage } from "./store-types";

const BACKFILL_BATCH = 200;

type GuildKeys = Effect.Success<ReturnType<typeof openGuildKeys>>;

type BackfillTarget = Readonly<{
  guildId: string;
  unphrased: (now: number, limit: number) => readonly UnphrasedMessage[];
  writePhrases: (extracted: readonly ExtractedPhrases[]) => void;
  again: (at: number) => Effect.Effect<void>;
}>;

const wrappedKeyOf = (guildId: string): Effect.Effect<Option.Option<string>> =>
  Effect.promise(() =>
    db.select({ wrappedKey: guild.wrappedKey }).from(guild).where(eq(guild.id, guildId)),
  ).pipe(Effect.map((rows) => Option.map(Array.head(rows), ({ wrappedKey }) => wrappedKey)));

const extractPhrases = (
  { guildId, keys }: Readonly<{ guildId: string; keys: GuildKeys }>,
  pending: readonly UnphrasedMessage[],
): Effect.Effect<readonly ExtractedPhrases[]> =>
  pipe(
    pending,
    Effect.forEach((message) =>
      openMessage(message.sealed, keys.key, {
        guildId,
        channelId: message.channelId,
        messageId: message.id,
      }).pipe(
        Effect.flatMap((body) =>
          phraseHashes({ searchKey: keys.searchKey, commonKey: keys.commonKey, source: body }),
        ),
        Effect.map((hashes) => ({ message, hashes })),
      ),
    ),
  );

const backfillPhrases = Effect.fn("backfillPhrases")(function* backfill(target: BackfillTarget) {
  const wrappedKey = yield* wrappedKeyOf(target.guildId);
  if (Option.isNone(wrappedKey)) {
    return;
  }
  const keys = yield* openGuildKeys(wrappedKey.value);
  const now = DateTime.toEpochMillis(yield* DateTime.now);
  const pending = target.unphrased(now, BACKFILL_BATCH);
  target.writePhrases(yield* extractPhrases({ guildId: target.guildId, keys }, pending));
  yield* Effect.annotateCurrentSpan({ guildId: target.guildId, messages: pending.length });
  if (pending.length === BACKFILL_BATCH) {
    yield* target.again(now);
  }
});

export { backfillPhrases };
export type { BackfillTarget };
