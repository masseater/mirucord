import { eq, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, Option } from "effect";

import { channel, db } from "#/shared/db/index.server";

import { columnsOf } from "./bot-access.server";
import type { ChannelSync } from "./channel-listing.server";
import { forgetChannelMessages } from "./message-rows.server";

const ID_CHUNK = 50;

type StoredRow = Readonly<{
  id: string;
  parentId: string | null;
  botAccess: "readable" | "hidden";
}>;

type Settlement = Readonly<{ departed: readonly string[]; orphaned: readonly string[] }>;

const isUnder = (parents: readonly string[], parentId: string | null): boolean =>
  Option.exists(Option.fromNullOr(parentId), (id) => parents.includes(id));

const settlementOf = (sync: ChannelSync, rows: readonly StoredRow[]): Settlement => {
  const current = new Set(sync.stored.map(({ id }) => id));
  const missing = rows.filter(({ id }) => !current.has(id));
  return {
    departed: missing
      .filter(({ parentId }) => !isUnder(sync.unlisted, parentId))
      .map(({ id }) => id),
    orphaned: missing
      .filter(
        ({ parentId, botAccess }) => isUnder(sync.unlisted, parentId) && botAccess === "readable",
      )
      .map(({ id }) => id),
  };
};

const loadStored = (guildId: string): Effect.Effect<readonly StoredRow[]> =>
  Effect.promise(() =>
    db
      .select({ id: channel.id, parentId: channel.parentId, botAccess: channel.botAccess })
      .from(channel)
      .where(eq(channel.guildId, guildId)),
  );

const deleteRows = (chunk: readonly string[]): Effect.Effect<void> =>
  Effect.asVoid(Effect.promise(() => db.delete(channel).where(inArray(channel.id, [...chunk]))));

const removeChannels = (ids: readonly string[]): Effect.Effect<void> => {
  const chunks = Array.chunksOf(ids, ID_CHUNK);
  return Effect.forEach(ids, forgetChannelMessages, { discard: true }).pipe(
    Effect.andThen(Effect.forEach(chunks, deleteRows, { discard: true })),
  );
};

const pauseChannels = (ids: readonly string[]): Effect.Effect<void> =>
  DateTime.now.pipe(
    Effect.flatMap((now) =>
      Effect.forEach(
        Array.chunksOf(ids, ID_CHUNK),
        (chunk) =>
          Effect.promise(() =>
            db
              .update(channel)
              .set(columnsOf({ status: "hidden", since: now }))
              .where(inArray(channel.id, [...chunk])),
          ),
        { discard: true },
      ),
    ),
  );

const settleStoredChannels = (sync: ChannelSync): Effect.Effect<void> =>
  loadStored(sync.discordGuild.id).pipe(
    Effect.map((rows) => settlementOf(sync, rows)),
    Effect.flatMap(({ departed, orphaned }) =>
      removeChannels(departed).pipe(Effect.andThen(pauseChannels(orphaned))),
    ),
  );

export { settleStoredChannels };
