import { and, count, eq, inArray, or } from "drizzle-orm";
import { Array, Data, DateTime, Effect, Option } from "effect";

import { isPastRetention } from "#/features/ingest/model/bot-access";
import { MESSAGE_TYPES } from "#/features/ingest/model/channel-kind";
import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { channel, db, ingestConsent, message } from "#/shared/db/index.server";

import { accessOf } from "./bot-access.server";
import { enqueue } from "./enqueue.server";
import { forgetChannelMessages } from "./message-rows.server";

const CLEARED = Option.getOrNull(Option.none<string>());

const loadScope = (guildId: string): Effect.Effect<ConsentScope> =>
  Effect.promise(() =>
    db
      .select({ guildId: ingestConsent.guildId })
      .from(ingestConsent)
      .where(eq(ingestConsent.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.match(Array.head(rows), {
        onNone: (): ConsentScope => ({ status: "awaiting" }),
        onSome: (): ConsentScope => ({ status: "granted" }),
      }),
    ),
  );

const purgeChannel = (channelId: string): Effect.Effect<void> =>
  forgetChannelMessages(channelId).pipe(
    Effect.andThen(
      Effect.promise(() =>
        db.batch([
          db.delete(message).where(eq(message.channelId, channelId)),
          db
            .update(channel)
            .set({ newestMessageId: CLEARED, oldestMessageId: CLEARED, backfill: "pending" })
            .where(eq(channel.id, channelId)),
        ]),
      ),
    ),
    Effect.asVoid,
  );

class GuildDataRemainsError extends Data.TaggedError("GuildDataRemainsError")<{
  readonly guildId: string;
  readonly remaining: number;
}> {}

const NOTHING_STORED = 0;

const storedCount = (guildId: string): Effect.Effect<number> =>
  Effect.promise(() =>
    db.select({ stored: count() }).from(message).where(eq(message.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.match(Array.head(rows), {
        onNone: () => NOTHING_STORED,
        onSome: ({ stored }) => stored,
      }),
    ),
  );

const purgeGuild = (guildId: string): Effect.Effect<void, GuildDataRemainsError> =>
  Effect.promise(() =>
    db.select({ id: channel.id }).from(channel).where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.flatMap((rows) => Effect.forEach(rows, ({ id }) => purgeChannel(id), { discard: true })),
    Effect.andThen(storedCount(guildId)),
    Effect.filterOrFail(
      (remaining) => remaining === NOTHING_STORED,
      (remaining) => new GuildDataRemainsError({ guildId, remaining }),
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

const purgeOutOfScope = (guildId: string): Effect.Effect<void> =>
  Effect.all({
    scope: loadScope(guildId),
    stored: Effect.promise(() =>
      db
        .selectDistinct({ id: message.channelId })
        .from(message)
        .where(eq(message.guildId, guildId)),
    ),
    channels: Effect.promise(() =>
      db
        .select({
          id: channel.id,
          newest: channel.newestMessageId,
          botAccess: channel.botAccess,
          hiddenAt: channel.hiddenAt,
        })
        .from(channel)
        .where(eq(channel.guildId, guildId)),
    ),
    now: DateTime.now,
  }).pipe(
    Effect.map(({ scope, stored, channels, now }) => {
      const withMessages = new Set(stored.map(({ id }) => id));
      return channels
        .filter((row) => Option.isSome(Option.fromNullOr(row.newest)) || withMessages.has(row.id))
        .filter((row) => scope.status === "awaiting" || isPastRetention(accessOf(row), now))
        .map(({ id }) => id);
    }),
    Effect.flatMap((outOfScope) => Effect.forEach(outOfScope, purgeChannel, { discard: true })),
  );

const NEEDS_INGEST = and(
  eq(channel.botAccess, "readable"),
  inArray(channel.type, [...MESSAGE_TYPES]),
  or(eq(channel.archive, "open"), eq(channel.backfill, "pending")),
);

const enqueueReadable = (guildId: string): Effect.Effect<void> =>
  Effect.promise(() =>
    db
      .select({ id: channel.id })
      .from(channel)
      .where(and(eq(channel.guildId, guildId), NEEDS_INGEST)),
  ).pipe(Effect.flatMap((rows) => enqueue(rows.map(({ id }) => ({ guildId, channelId: id })))));

const enqueueInScope = (guildId: string): Effect.Effect<void> =>
  loadScope(guildId).pipe(
    Effect.flatMap((scope) => {
      if (scope.status === "awaiting") {
        return Effect.void;
      }
      return enqueueReadable(guildId);
    }),
  );

const refreshIngest = (guildId: string): Effect.Effect<void> =>
  purgeOutOfScope(guildId).pipe(Effect.andThen(enqueueInScope(guildId)));

export { GuildDataRemainsError, loadScope, purgeChannel, refreshIngest, withdrawGuild };
