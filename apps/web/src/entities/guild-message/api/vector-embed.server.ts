import { and, desc, eq, isNull, max } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { Array, Boolean, Effect, Option, Order, pipe, String } from "effect";

import { searchableTexts } from "#/entities/guild-message/lib/search-tokens.server";
import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";
import { encodeVector } from "#/shared/ai";
import type { Quantized } from "#/shared/ai";
import { embedTexts, nextBudgetDay } from "#/shared/ai/index.server";
import { openMessage, sealBytes } from "#/shared/crypto/index.server";

const EMBED_BATCH = 50;
const BATCHES_PER_RUN = 4;
const RUN_SIZE = EMBED_BATCH * BATCHES_PER_RUN;
const NO_VECTOR = 0;
const NEXT = 1;
const TEXT_SEPARATOR = "\n";

type Keys = Readonly<{ guildId: string; key: CryptoKey }>;

type EmbedOutcome =
  | Readonly<{ status: "done" }>
  | Readonly<{ status: "more" }>
  | Readonly<{ status: "waiting"; until: number }>;

type PendingRow = Readonly<{
  id: string;
  channelId: string;
  sealed: string;
  version: number;
}>;

type Embedding = Readonly<{ row: PendingRow; text: string }>;

const vectorContext = ({
  guildId,
  messageId,
}: Readonly<{ guildId: string; messageId: string }>): string => `${guildId}/${messageId}/vector`;

const pendingRows = (db: DrizzleSqliteDODatabase, limit: number): readonly PendingRow[] =>
  db
    .select({
      id: guildMessage.id,
      channelId: guildMessage.channelId,
      sealed: guildMessage.sealed,
      version: guildMessage.version,
    })
    .from(guildMessage)
    .where(isNull(guildMessage.vector))
    .orderBy(desc(guildMessage.createdAt))
    .limit(limit)
    .all();

const nextVectorAt = (db: DrizzleSqliteDODatabase): number => {
  const latest = db
    .select({ at: max(guildMessage.vectorAt) })
    .from(guildMessage)
    .get();
  return (
    Option.fromUndefinedOr(latest).pipe(
      Option.flatMap(({ at }) => Option.fromNullOr(at)),
      Option.getOrElse(() => NO_VECTOR),
    ) + NEXT
  );
};

const storeVector = (
  db: DrizzleSqliteDODatabase,
  { row, vector, at }: Readonly<{ row: PendingRow; vector: Uint8Array; at: number }>,
): void => {
  db.update(guildMessage)
    .set({ vector, vectorAt: at })
    .where(and(eq(guildMessage.id, row.id), eq(guildMessage.version, row.version)))
    .run();
};

const textsOf = (keys: Keys, rows: readonly PendingRow[]): Effect.Effect<readonly Embedding[]> =>
  pipe(
    rows,
    Effect.forEach((row) =>
      openMessage(row.sealed, keys.key, {
        guildId: keys.guildId,
        channelId: row.channelId,
        messageId: row.id,
      }).pipe(
        Effect.map((body) => ({
          row,
          text: pipe(searchableTexts(body), Array.join(TEXT_SEPARATOR)),
        })),
      ),
    ),
  );

const sealVector = (keys: Keys, row: PendingRow, vector: Uint8Array): Effect.Effect<Uint8Array> =>
  sealBytes({
    bytes: vector,
    key: keys.key,
    context: vectorContext({ guildId: keys.guildId, messageId: row.id }),
  });

type Batch = Readonly<{ db: DrizzleSqliteDODatabase; keys: Keys }>;

type Embedded = Readonly<{ row: PendingRow; vector: Quantized }>;

const storeVectors = Effect.fnUntraced(function* storeVectors(
  { db, keys }: Batch,
  { embedded, blank }: Readonly<{ embedded: readonly Embedded[]; blank: readonly Embedding[] }>,
) {
  const sealed = yield* pipe(
    embedded,
    Effect.forEach(({ row, vector }) =>
      sealVector(keys, row, encodeVector(vector)).pipe(Effect.map((bytes) => ({ row, bytes }))),
    ),
  );
  const at = nextVectorAt(db);
  for (const { row } of blank) {
    storeVector(db, { row, vector: new Uint8Array(), at });
  }
  for (const { row, bytes } of sealed) {
    storeVector(db, { row, vector: bytes, at });
  }
});

const embedChunk = Effect.fn("vectors.embedChunk")(function* embedChunk(
  batch: Batch,
  chunk: readonly Embedding[],
) {
  const result = yield* embedTexts({
    priority: "background",
    texts: pipe(
      chunk,
      Array.map(({ text }) => text),
    ),
  });
  if (result.status === "over-budget") {
    return false;
  }
  const embedded = Array.zipWith(chunk, result.vectors, ({ row }, vector) => ({ row, vector }));
  yield* storeVectors(batch, { embedded, blank: [] });
  yield* Effect.annotateCurrentSpan({ embedded: chunk.length });
  return true;
});

const byLength = Order.mapInput(Order.Number, ({ text }: Embedding) => text.length);

const wordedTexts = Effect.fnUntraced(function* wordedTexts(
  batch: Batch,
  rows: readonly PendingRow[],
) {
  const texts = yield* textsOf(batch.keys, rows);
  const blank = pipe(
    texts,
    Array.filter(({ text }) => String.isEmpty(text)),
  );
  yield* storeVectors(batch, { embedded: [], blank });
  return Array.sort(
    pipe(
      texts,
      Array.filter(({ text }) => String.isNonEmpty(text)),
    ),
    byLength,
  );
});

const runOutcome = (rows: number): EmbedOutcome =>
  Boolean.match(rows < RUN_SIZE, {
    onTrue: () => ({ status: "done" }),
    onFalse: () => ({ status: "more" }),
  });

const embedPending = Effect.fn("vectors.embedPending")(function* embedPending(
  batch: Readonly<{ db: DrizzleSqliteDODatabase; keys: Keys }>,
) {
  const rows = pendingRows(batch.db, RUN_SIZE);
  const worded = yield* wordedTexts(batch, rows);
  for (const chunk of Array.chunksOf(worded, EMBED_BATCH)) {
    if (!(yield* embedChunk(batch, chunk))) {
      return { status: "waiting", until: yield* nextBudgetDay } satisfies EmbedOutcome;
    }
  }
  return runOutcome(rows.length);
});

export { embedPending, vectorContext };
export type { EmbedOutcome, Keys };
