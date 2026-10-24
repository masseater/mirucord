import { eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { channel, db, ingestConsent } from "#/shared/db/index.server";

import { purgeChannel } from "./consent-scope.server";
import { enqueueWithdrawal } from "./enqueue.server";

const taggedError = Schema.TaggedError;

class GuildDataRemainsError extends taggedError<
  GuildDataRemainsError,
  { readonly brand: unique symbol }
>()("GuildDataRemainsError", {
  guildId: Schema.String,
  remaining: Schema.Finite,
}) {}

const NOTHING_STORED = 0;

const storedCount = (guildId: string): Effect.Effect<number> =>
  Effect.promise(() => guildStore(guildId).count());

const purgeGuild = (guildId: string): Effect.Effect<void, GuildDataRemainsError> =>
  Effect.promise(() =>
    db.select({ id: channel.id }).from(channel).where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.flatMap((rows) =>
      Effect.forEach(rows, ({ id }) => purgeChannel({ guildId, channelId: id }), {
        discard: true,
      }),
    ),
    Effect.andThen(storedCount(guildId)),
    Effect.filterOrFail(
      (remaining) => remaining === NOTHING_STORED,
      (remaining) => GuildDataRemainsError.make({ guildId, remaining }),
    ),
    Effect.asVoid,
  );

const withdrawGuild = (guildId: string): Effect.Effect<void, GuildDataRemainsError> =>
  purgeGuild(guildId).pipe(
    Effect.andThen(
      Effect.promise(() => db.delete(ingestConsent).where(eq(ingestConsent.guildId, guildId))),
    ),
    Effect.andThen(purgeGuild(guildId)),
  );

const setConsentState = (guildId: string, state: "granted" | "withdrawing"): Effect.Effect<void> =>
  Effect.promise(() =>
    db.update(ingestConsent).set({ state }).where(eq(ingestConsent.guildId, guildId)),
  ).pipe(Effect.asVoid);

const requestWithdrawal = (guildId: string): Effect.Effect<void> =>
  enqueueWithdrawal(guildId).pipe(Effect.andThen(setConsentState(guildId, "withdrawing")));

const abandonWithdrawal = (guildId: string): Effect.Effect<void> =>
  setConsentState(guildId, "granted");

export { abandonWithdrawal, requestWithdrawal, withdrawGuild };
export type { GuildDataRemainsError };
