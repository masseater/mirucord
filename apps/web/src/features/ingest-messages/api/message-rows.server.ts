import { eq } from "drizzle-orm";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { db, message } from "#/shared/db/index.server";

import { deleteMessagesByIds } from "./id-chunks.server.ts";

export type StoredMessage = Readonly<{
  id: string;
  editedAt: Option.Option<number>;
  describedWith: Option.Option<string>;
}>;

export type ChannelRef = Readonly<{ guildId: string; channelId: string }>;

export type GuildMessages = Readonly<{ guildId: string; ids: readonly string[] }>;

export const findStored = ({
  guildId,
  ids,
}: GuildMessages): Effect.Effect<readonly StoredMessage[]> =>
  Effect.promise(() => guildStore(guildId).stored(ids)).pipe(
    Effect.map((rows) =>
      pipe(
        rows,
        Array.map(({ id, editedAt, describedWith }) => ({
          id,
          editedAt: Option.fromNullOr(editedAt),
          describedWith: Option.fromNullOr(describedWith),
        })),
      ),
    ),
  );

const NO_BOUND = Option.getOrNull(Option.none<number>());

export const channelMessagesSince = ({
  guildId,
  channelId,
  since,
}: ChannelRef & Readonly<{ since: Option.Option<DateTime.DateTime> }>): Effect.Effect<
  readonly string[]
> => {
  const from = Option.getOrNull(since.pipe(Option.map(DateTime.toEpochMillis)));
  return Effect.promise(() => guildStore(guildId).idsBetween(channelId, { from, upTo: NO_BOUND }));
};

export const storedInChannel = ({
  guildId,
  channelId,
  ids,
}: ChannelRef & Readonly<{ ids: readonly string[] }>): Effect.Effect<readonly string[]> =>
  Effect.promise(() => guildStore(guildId).idsInChannel(channelId, ids));

export const forgetGuildMessages = (guildId: string): Effect.Effect<void> =>
  Effect.promise(() => guildStore(guildId).clear());

export const forgetChannelMessages = ({ guildId, channelId }: ChannelRef): Effect.Effect<void> =>
  Effect.all(
    [
      Effect.promise(() => guildStore(guildId).removeChannel(channelId)),
      Effect.promise(() => db.delete(message).where(eq(message.channelId, channelId))),
    ],
    { concurrency: 1, discard: true },
  );

export const deleteMessages = ({ guildId, ids }: GuildMessages): Effect.Effect<void> =>
  Effect.all([Effect.promise(() => guildStore(guildId).remove(ids)), deleteMessagesByIds(ids)], {
    concurrency: 1,
    discard: true,
  });
