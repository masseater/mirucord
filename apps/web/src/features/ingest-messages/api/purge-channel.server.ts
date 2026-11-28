import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { isPastRetention } from "#/features/ingest-messages/model/bot-access";
import type { ConsentScope } from "#/features/ingest-messages/model/consent-scope";
import { channel, db } from "#/shared/db/index.server";

import { accessOf } from "./bot-access.server.ts";
import { forgetChannelMessages } from "./message-rows.server.ts";
import type { ChannelRef } from "./message-rows.server.ts";

const CLEARED = Option.getOrNull(Option.none<string>());

export const purgeChannel = (ref: ChannelRef): Effect.Effect<void> =>
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

export const purgeOutOfScope = ({
  guildId,
  scope,
}: Readonly<{ guildId: string; scope: ConsentScope }>): Effect.Effect<void> =>
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
      return pipe(
        channels,
        Array.filter(
          (row) => Option.isSome(Option.fromNullOr(row.newest)) || withMessages.has(row.id),
        ),
        Array.filter((row) => scope.status === "awaiting" || isPastRetention(accessOf(row), now)),
        Array.map(({ id }) => id),
      );
    }),
    Effect.flatMap((outOfScope) =>
      Effect.forEach(outOfScope, (channelId) => purgeChannel({ guildId, channelId }), {
        concurrency: 1,
        discard: true,
      }),
    ),
  );
