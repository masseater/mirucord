import { Array, Effect, Number, Option, Schema } from "effect";

import { ORDINAL_SPAN, POSTING_BYTES, STAMP_BYTES, WORD_BYTES } from "./search-layout";

const CHUNK_SIZE = 128;
const SHARD_TARGET_BYTES = 131_072;
const FIRST = 0;
const NONE = 0;
const ONE_SHARD = 1;
const LAST = -1;
const LITTLE_ENDIAN = true;

const textEncoder = new TextEncoder();

type IndexRow = Readonly<{
  channelId: string;
  createdAt: number;
  tokens: readonly number[];
}>;

const SealedEntrySchema = Schema.Struct({
  id: Schema.String,
  channelId: Schema.String,
  sealed: Schema.String,
  createdAt: Schema.Finite,
  editedAt: Schema.NullOr(Schema.Finite),
});

type SealedEntry = typeof SealedEntrySchema.Type;

const encodeChunkJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Array(SealedEntrySchema)));

const MetaHeader = Schema.Struct({
  count: Schema.Int,
  channels: Schema.Array(Schema.String),
});

const encodeMetaHeader = Schema.encodeEffect(Schema.fromJsonString(MetaHeader));

type BuiltIndex = Readonly<{
  count: number;
  meta: ArrayBuffer;
  shards: readonly ArrayBuffer[];
}>;

const shardCountOf = (postings: number): number =>
  Number.max(Math.ceil((postings * POSTING_BYTES) / SHARD_TARGET_BYTES), ONE_SHARD);

const shardOf = ({ token, shards }: Readonly<{ token: number; shards: number }>): number =>
  token % shards;

const chunkOf = (ordinal: number): number => Math.floor(ordinal / CHUNK_SIZE);

const chunkCountOf = (rows: number): number => Math.ceil(rows / CHUNK_SIZE);

const concatBytes = (parts: readonly Readonly<ArrayBuffer>[]): Uint8Array<ArrayBuffer> => {
  const joined = new Uint8Array(Number.sumAll(parts.map((part) => part.byteLength)));
  let offset = FIRST;
  for (const part of parts) {
    joined.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return joined;
};

type TokenRuns = Readonly<{ tokens: readonly number[]; offsets: readonly number[] }>;

const runsOf = (sorted: readonly number[]): TokenRuns => {
  const tokens: number[] = [];
  const offsets: number[] = [];
  for (const [index, pair] of sorted.entries()) {
    const token = Math.floor(pair / ORDINAL_SPAN);
    if (tokens.at(LAST) !== token) {
      tokens.push(token);
      offsets.push(index);
    }
  }
  offsets.push(sorted.length);
  return { tokens, offsets };
};

const encodeShard = (pairs: readonly number[]): Uint8Array<ArrayBuffer> => {
  const sorted = Array.fromIterable(Float64Array.from(pairs).toSorted());
  const { tokens, offsets } = runsOf(sorted);
  const words = Uint32Array.from([tokens.length, ...tokens, ...offsets]);
  const postings = Uint16Array.from(sorted, (pair) => pair % ORDINAL_SPAN);
  return concatBytes([words.buffer, postings.buffer]);
};

const encodeShards = (rows: readonly IndexRow[]): readonly Uint8Array<ArrayBuffer>[] => {
  const shards = shardCountOf(Number.sumAll(rows.map(({ tokens }) => tokens.length)));
  const buckets = Array.makeBy(shards, (): number[] => []);
  for (const [ordinal, { tokens }] of rows.entries()) {
    for (const token of tokens) {
      Option.map(Option.fromUndefinedOr(buckets[shardOf({ token, shards })]), (bucket) =>
        bucket.push(token * ORDINAL_SPAN + ordinal),
      );
    }
  }
  return buckets.map((pairs) => encodeShard(pairs));
};

const metaPrefix = (json: string): Uint8Array<ArrayBuffer> => {
  const header = textEncoder.encode(json);
  const padded = Math.ceil((WORD_BYTES + header.byteLength) / STAMP_BYTES) * STAMP_BYTES;
  const prefix = new Uint8Array(padded);
  new DataView(prefix.buffer).setUint32(FIRST, header.byteLength, LITTLE_ENDIAN);
  prefix.set(header, WORD_BYTES);
  return prefix;
};

const encodeMeta = (rows: readonly IndexRow[]): Effect.Effect<Uint8Array<ArrayBuffer>> => {
  const channels = Array.dedupe(rows.map(({ channelId }) => channelId));
  const indexOf = new Map(channels.map((id, index) => [id, index]));
  return encodeMetaHeader({ count: rows.length, channels }).pipe(
    Effect.orDie,
    Effect.map((json) =>
      concatBytes([
        metaPrefix(json).buffer,
        Float64Array.from(rows, ({ createdAt }) => createdAt).buffer,
        Uint16Array.from(rows, ({ channelId }) => indexOf.get(channelId) ?? NONE).buffer,
      ]),
    ),
  );
};

const encodeChunk = (entries: readonly SealedEntry[]): Effect.Effect<string> =>
  encodeChunkJson(entries).pipe(Effect.orDie);

const buildIndex = (rows: readonly IndexRow[]): Effect.Effect<BuiltIndex> =>
  encodeMeta(rows).pipe(
    Effect.map((meta) => ({
      count: rows.length,
      meta: meta.buffer,
      shards: encodeShards(rows).map(({ buffer }) => buffer),
    })),
  );

export { buildIndex, chunkCountOf, chunkOf, CHUNK_SIZE, encodeChunk, SealedEntrySchema, shardOf };
export type { BuiltIndex, IndexRow, SealedEntry };
