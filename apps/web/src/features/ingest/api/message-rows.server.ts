import { eq, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { db, message } from "#/shared/db/index.server";

import { inIdChunks } from "./id-chunks.server";

type StoredMessage = Readonly<{
  id: string;
  editedAt: Option.Option<number>;
  describedWith: Option.Option<string>;
}>;

type ChannelRef = Readonly<{ guildId: string; channelId: string }>;

type GuildMessages = Readonly<{ guildId: string; ids: readonly string[] }>;

const findStored = ({ guildId, ids }: GuildMessages): Effect.Effect<readonly StoredMessage[]> =>
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

const channelMessagesSince = ({
  guildId,
  channelId,
  since,
}: ChannelRef & Readonly<{ since: Option.Option<DateTime.DateTime> }>): Effect.Effect<
  readonly string[]
> => {
  const from = Option.getOrNull(since.pipe(Option.map(DateTime.toEpochMillis)));
  return Effect.promise(() => guildStore(guildId).idsBetween(channelId, { from, upTo: NO_BOUND }));
};

const storedInChannel = ({
  guildId,
  channelId,
  ids,
}: ChannelRef & Readonly<{ ids: readonly string[] }>): Effect.Effect<readonly string[]> =>
  Effect.promise(() => guildStore(guildId).idsInChannel(channelId, ids));

const forgetGuildMessages = (guildId: string): Effect.Effect<void> =>
  Effect.promise(() => guildStore(guildId).clear());

const forgetChannelMessages = ({ guildId, channelId }: ChannelRef): Effect.Effect<void> =>
  Effect.all(
    [
      Effect.promise(() => guildStore(guildId).removeChannel(channelId)),
      Effect.promise(() => db.delete(message).where(eq(message.channelId, channelId))),
    ],
    { discard: true },
  );

const deleteMessages = ({ guildId, ids }: GuildMessages): Effect.Effect<void> =>
  Effect.all(
    [
      Effect.promise(() => guildStore(guildId).remove(ids)),
      inIdChunks({
        ids,
        run: (chunk) => db.delete(message).where(inArray(message.id, [...chunk])),
      }),
    ],
    { discard: true },
  );

export {
  channelMessagesSince,
  deleteMessages,
  findStored,
  forgetChannelMessages,
  forgetGuildMessages,
  storedInChannel,
};
export type { ChannelRef, GuildMessages, StoredMessage };
