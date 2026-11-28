import { eq } from "drizzle-orm";
import { Array, Effect, Option, pipe, Record } from "effect";

import { guildStore, sealedTokens } from "#/entities/guild-message/index.server";
import type { IndexedMessage, StoredRow } from "#/entities/guild-message/index.server";
import { openGuildKeys } from "#/shared/crypto/index.server";
import { db, guild, message } from "#/shared/db/index.server";

import { enqueueMigration } from "./enqueue.server.ts";
import { deleteMessagesByIds } from "./id-chunks.server.ts";

const MIGRATE_BATCH = 200;
const ANY_ROW = 1;

type LegacyRow = StoredRow & Readonly<{ guildId: string; wrappedKey: string }>;

const loadBatch: Effect.Effect<readonly LegacyRow[]> = Effect.promise(() =>
  db
    .select({
      id: message.id,
      guildId: message.guildId,
      channelId: message.channelId,
      authorId: message.authorId,
      sealed: message.sealed,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      describedWith: message.describedWith,
      wrappedKey: guild.wrappedKey,
    })
    .from(message)
    .innerJoin(guild, eq(message.guildId, guild.id))
    .limit(MIGRATE_BATCH),
).pipe(
  Effect.map((rows) =>
    pipe(
      rows,
      Array.map(({ createdAt, editedAt, ...row }) => ({
        ...row,
        createdAt: createdAt.getTime(),
        editedAt: Option.getOrNull(
          Option.map(Option.fromNullOr(editedAt), (date) => date.getTime()),
        ),
      })),
    ),
  ),
);

const indexRow = (
  keys: Readonly<{ key: CryptoKey; searchKey: CryptoKey }>,
  { guildId, id, channelId, authorId, sealed, createdAt, editedAt, describedWith }: LegacyRow,
): Effect.Effect<IndexedMessage> =>
  sealedTokens({ sealed, keys, address: { guildId, channelId, messageId: id } }).pipe(
    Effect.map((tokens) => ({
      row: { id, channelId, authorId, sealed, createdAt, editedAt, describedWith },
      tokens,
      phrases: { status: "pending" },
    })),
  );

const adoptGuild = (rows: Array.NonEmptyReadonlyArray<LegacyRow>): Effect.Effect<void> => {
  const [{ guildId, wrappedKey }] = rows;
  return openGuildKeys(wrappedKey).pipe(
    Effect.flatMap((keys) =>
      Effect.forEach(rows, (row) => indexRow(keys, row), { concurrency: 1 }),
    ),
    Effect.flatMap((indexed) => Effect.promise(() => guildStore(guildId).write(indexed, "adopt"))),
  );
};

export const migrateMessages: Effect.Effect<void> = loadBatch.pipe(
  Effect.tap((rows) =>
    Effect.forEach(Record.values(Array.groupBy(rows, ({ guildId }) => guildId)), adoptGuild, {
      concurrency: 1,
      discard: true,
    }),
  ),
  Effect.tap((rows) =>
    deleteMessagesByIds(
      pipe(
        rows,
        Array.map(({ id }) => id),
      ),
    ),
  ),
  Effect.flatMap((rows) => {
    if (rows.length < MIGRATE_BATCH) {
      return Effect.logInfo("Message migration finished");
    }
    return enqueueMigration;
  }),
);

export const startMigration: Effect.Effect<void> = Effect.promise(() =>
  db.select({ id: message.id }).from(message).limit(ANY_ROW),
).pipe(
  Effect.flatMap((rows) => {
    if (Array.isReadonlyArrayEmpty(rows)) {
      return Effect.void;
    }
    return enqueueMigration;
  }),
);
