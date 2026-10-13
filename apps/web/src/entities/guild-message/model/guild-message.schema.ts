import { isNull } from "drizzle-orm";
import { customType, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { Array } from "effect";

const tokenColumn = customType<{ data: readonly number[]; driverData: ArrayBuffer }>({
  dataType: () => "blob",
  toDriver: (tokens) => Uint32Array.from(Array.dedupe(tokens)).buffer,
  fromDriver: (blob) => Array.fromIterable(new Uint32Array(blob)),
});

const bytesColumn = customType<{ data: Uint8Array; driverData: ArrayBuffer }>({
  dataType: () => "blob",
  toDriver: (bytes) => Uint8Array.from(bytes).buffer,
  fromDriver: (blob) => new Uint8Array(blob),
});

const UNPUBLISHED = 0;

const guildMessage = sqliteTable(
  "message",
  {
    seq: integer().primaryKey({ autoIncrement: true }),
    id: text().notNull().unique(),
    channelId: text().notNull(),
    authorId: text().notNull(),
    sealed: text().notNull(),
    createdAt: integer().notNull(),
    editedAt: integer(),
    describedWith: text(),
    phrases: text().$type<"pending" | "extracted">().notNull().default("pending"),
    tokens: tokenColumn(),
    version: integer().notNull().default(UNPUBLISHED),
    vector: bytesColumn(),
    vectorAt: integer(),
  },
  (table) => [
    index("message_channel_created_idx").on(table.channelId, table.createdAt),
    index("message_phrases_created_idx").on(table.phrases, table.createdAt),
    index("message_created_idx").on(table.createdAt),
    index("message_version_idx").on(table.version),
    index("message_unembedded_idx").on(table.createdAt).where(isNull(table.vector)),
    index("message_vector_at_idx").on(table.vectorAt),
  ],
);

const BOUND_LIMIT = 90;

const TRACKED_COLUMNS = {
  id: guildMessage.id,
  createdAt: guildMessage.createdAt,
  version: guildMessage.version,
};

export { BOUND_LIMIT, guildMessage, TRACKED_COLUMNS };
