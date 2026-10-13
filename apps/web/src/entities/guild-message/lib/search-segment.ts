import { Array, Effect, Number, Option, Schema } from "effect";

import { STAMP_BYTES } from "./search-layout";
import { encodeShard, shardCountOf, shardOf } from "./search-shard";
import type { Postings, TokenPostings } from "./search-shard";

const CHUNK_SIZE = 128;
const FIRST = 0;
const ONE_SHARD = 1;

type IndexRow = Readonly<{
  channel: number;
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

type BuiltIndex = Readonly<{ count: number; shards: readonly ArrayBuffer[] }>;

const chunkOf = (ordinal: number): number => Math.floor(ordinal / CHUNK_SIZE);

const chunkCountOf = (rows: number): number => Math.ceil(rows / CHUNK_SIZE);

interface Collecting {
  ordinals: number[];
  channels: number[];
}

type Bucket = Map<number, Collecting>;

const entriesOf = (bucket: readonly (readonly [number, Postings])[]): readonly TokenPostings[] =>
  bucket.map(([token, { ordinals, channels }]) => ({
    token,
    ordinals,
    channels,
  }));

const collect = (
  rows: readonly IndexRow[],
  shards: number,
): readonly (readonly TokenPostings[])[] => {
  const buckets = Array.makeBy(shards, (): Bucket => new Map());
  const add = (token: number, ordinal: number, channel: number): void => {
    for (const bucket of Option.toArray(
      Option.fromUndefinedOr(buckets[shardOf({ token, shards })]),
    )) {
      const found = bucket.get(token) ?? { ordinals: [], channels: [] };
      found.ordinals.push(ordinal);
      found.channels.push(channel);
      bucket.set(token, found);
    }
  };
  for (const [ordinal, row] of rows.entries()) {
    for (const token of row.tokens) {
      add(token, ordinal, row.channel);
    }
  }
  return buckets.map((bucket) => entriesOf(Array.fromIterable(bucket)));
};

const encodeShards = (rows: readonly IndexRow[], shards: number): readonly ArrayBuffer[] =>
  collect(rows, shards).map((entries) => encodeShard(entries));

const postingsOf = (rows: readonly IndexRow[]): number =>
  Number.sumAll(rows.map(({ tokens }) => tokens.length));

const buildIndex = (rows: readonly IndexRow[]): BuiltIndex => ({
  count: rows.length,
  shards: encodeShards(rows, shardCountOf(postingsOf(rows))),
});

const encodeRecent = (rows: readonly IndexRow[]): ArrayBuffer => {
  const [index] = encodeShards(rows, ONE_SHARD);
  const indexBytes = Option.getOrElse(Option.fromUndefinedOr(index), () => new ArrayBuffer(FIRST));
  const stampsAt = STAMP_BYTES;
  const indexAt = stampsAt + rows.length * STAMP_BYTES;
  const buffer = new ArrayBuffer(indexAt + indexBytes.byteLength);
  new DataView(buffer).setUint32(FIRST, rows.length, true);
  new Float64Array(buffer, stampsAt, rows.length).set(rows.map(({ createdAt }) => createdAt));
  new Uint8Array(buffer, indexAt).set(new Uint8Array(indexBytes));
  return buffer;
};

const encodeChunk = (entries: readonly SealedEntry[]): Effect.Effect<string> =>
  encodeChunkJson(entries).pipe(Effect.orDie);

export {
  buildIndex,
  chunkCountOf,
  chunkOf,
  CHUNK_SIZE,
  encodeChunk,
  encodeRecent,
  SealedEntrySchema,
};
export type { BuiltIndex, IndexRow, SealedEntry };
