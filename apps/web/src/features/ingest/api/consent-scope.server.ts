import { and, eq, inArray, or } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { isPastRetention } from "#/features/ingest/model/bot-access";
import { MESSAGE_TYPES } from "#/features/ingest/model/channel-kind";
import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { channel, db, ingestConsent } from "#/shared/db/index.server";

import { accessOf } from "./bot-access.server";
import { enqueue } from "./enqueue.server";
import { forgetChannelMessages } from "./message-rows.server";
import type { ChannelRef } from "./message-rows.server";

const CLEARED = Option.getOrNull(Option.none<string>());

const loadScope = (guildId: string): Effect.Effect<ConsentScope> =>
  Effect.promise(() =>
    db
      .select({ state: ingestConsent.state })
      .from(ingestConsent)
      .where(eq(ingestConsent.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.match(Array.head(rows).pipe(Option.filter(({ state }) => state === "granted")), {
        onNone: (): ConsentScope => ({ status: "awaiting" }),
        onSome: (): ConsentScope => ({ status: "granted" }),
      }),
    ),
  );

const purgeChannel = (ref: ChannelRef): Effect.Effect<void> =>
  forgetChannelMessages(ref).pipe(
    Effect.andThen(
      Effect.promise(() =>
        db
          .update(channel)
          .set({ newestMessageId: CLEARED, oldestMessageId: CLEARED, backfill: "pending" })
          .where(eq(channel.id, ref.channelId)),
      ),
    ),
    Effect.asVoid,
  );

const purgeOutOfScope = (guildId: string, scope: ConsentScope): Effect.Effect<void> =>
  Effect.all(
    {
      stored: Effect.promise(() => guildStore(guildId).channels()),
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
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map(({ stored, channels, now }) => {
      const withMessages = new Set(stored);
      return channels
        .filter((row) => Option.isSome(Option.fromNullOr(row.newest)) || withMessages.has(row.id))
        .filter((row) => scope.status === "awaiting" || isPastRetention(accessOf(row), now))
        .map(({ id }) => id);
    }),
    Effect.flatMap((outOfScope) =>
      Effect.forEach(outOfScope, (channelId) => purgeChannel({ guildId, channelId }), {
        discard: true,
      }),
    ),
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

const enqueueInScope = (guildId: string, scope: ConsentScope): Effect.Effect<void> => {
  if (scope.status === "awaiting") {
    return Effect.void;
  }
  return enqueueReadable(guildId);
};

const refreshIngest = (guildId: string): Effect.Effect<void> =>
  loadScope(guildId).pipe(
    Effect.tap((scope) => purgeOutOfScope(guildId, scope)),
    Effect.flatMap((scope) => enqueueInScope(guildId, scope)),
  );

export { loadScope, purgeChannel, refreshIngest };
