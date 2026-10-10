import { and, eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { isPastRetention } from "#/features/ingest/model/bot-access";
import { isInScope } from "#/features/ingest/model/consent-scope";
import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { channel, db, ingestConsent, message } from "#/shared/db/index.server";

import { accessOf } from "./bot-access.server";
import { enqueue } from "./enqueue.server";
import { deleteVectors } from "./vectors.server";

const CLEARED = Option.getOrNull(Option.none<string>());

const loadScope = (guildId: string): Effect.Effect<ConsentScope> =>
  Effect.promise(() =>
    db
      .select({ channelIds: ingestConsent.channelIds })
      .from(ingestConsent)
      .where(eq(ingestConsent.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.match(Array.head(rows), {
        onNone: (): ConsentScope => ({ status: "awaiting" }),
        onSome: ({ channelIds }): ConsentScope => ({ status: "granted", channelIds }),
      }),
    ),
  );

const purgeChannel = (channelId: string): Effect.Effect<void> =>
  Effect.promise(() =>
    db.select({ id: message.id }).from(message).where(eq(message.channelId, channelId)),
  ).pipe(
    Effect.flatMap((rows) => deleteVectors(rows.map(({ id }) => id))),
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
          parentId: channel.parentId,
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
        .filter((row) => !isInScope(scope, row) || isPastRetention(accessOf(row), now))
        .map(({ id }) => id);
    }),
    Effect.flatMap((outOfScope) => Effect.forEach(outOfScope, purgeChannel, { discard: true })),
  );

const enqueueInScope = (guildId: string): Effect.Effect<void> =>
  Effect.all({
    scope: loadScope(guildId),
    rows: Effect.promise(() =>
      db
        .select({ id: channel.id, parentId: channel.parentId })
        .from(channel)
        .where(and(eq(channel.guildId, guildId), eq(channel.botAccess, "readable"))),
    ),
  }).pipe(
    Effect.flatMap(({ scope, rows }) =>
      enqueue(
        rows.filter((row) => isInScope(scope, row)).map(({ id }) => ({ guildId, channelId: id })),
      ),
    ),
  );

const refreshIngest = (guildId: string): Effect.Effect<void> =>
  purgeOutOfScope(guildId).pipe(Effect.andThen(enqueueInScope(guildId)));

export { loadScope, refreshIngest };
