import { Array, Boolean, Number, Option } from "effect";

import { CHANNEL_BYTES, ORDINAL_BYTES, WORD_BYTES } from "./search-layout";

const FIRST = 0;
const NEXT = 1;
const HALF = 2;
const HEADER_WORDS = 1;
const LITTLE_ENDIAN = true;
const SHARD_TARGET_BYTES = 65_536;
const ONE_SHARD = 1;
const DOUBLE = 2;
const LAST = -1;

type Postings = Readonly<{ ordinals: readonly number[]; channels: readonly number[] }>;

type TokenPostings = Readonly<{ token: number } & Postings>;

type PostingView = Readonly<{ ordinals: Uint32Array; channels: Uint16Array }>;

type ShardLayout = Readonly<{
  count: number;
  tokens: Uint32Array;
  offsets: Uint32Array;
  ordinals: Uint32Array;
  channels: Uint16Array;
}>;

const POSTING_BYTES = ORDINAL_BYTES + CHANNEL_BYTES;

const shardCountOf = (postings: number): number => {
  const wanted = Math.ceil((postings * POSTING_BYTES) / SHARD_TARGET_BYTES);
  let shards = ONE_SHARD;
  while (shards < wanted) {
    shards *= DOUBLE;
  }
  return shards;
};

const shardOf = ({ token, shards }: Readonly<{ token: number; shards: number }>): number =>
  token % shards;

const concatBytes = (parts: readonly Readonly<ArrayBuffer>[]): ArrayBuffer => {
  const joined = new Uint8Array(Number.sumAll(parts.map((part) => part.byteLength)));
  let offset = FIRST;
  for (const part of parts) {
    joined.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return joined.buffer;
};

const startsOf = (sorted: readonly TokenPostings[]): readonly number[] => {
  const starts = [FIRST];
  for (const { ordinals } of sorted) {
    starts.push((starts.at(LAST) ?? FIRST) + ordinals.length);
  }
  return starts;
};

const encodeShard = (entries: readonly TokenPostings[]): ArrayBuffer => {
  const sorted = Array.sortWith(entries, ({ token }) => token, Number.Order);
  const header = Uint32Array.from([
    sorted.length,
    ...sorted.map(({ token }) => token),
    ...startsOf(sorted),
  ]);
  const ordinals = Uint32Array.from(sorted.flatMap((entry) => entry.ordinals));
  const channels = Uint16Array.from(sorted.flatMap((entry) => entry.channels));
  return concatBytes([header.buffer, ordinals.buffer, channels.buffer]);
};

const layoutOf = (shard: Readonly<ArrayBuffer>): ShardLayout => {
  const count = new DataView(shard).getUint32(FIRST, LITTLE_ENDIAN);
  const words = HEADER_WORDS + count + count + NEXT;
  const offsets = new Uint32Array(shard, (HEADER_WORDS + count) * WORD_BYTES, count + NEXT);
  const total = offsets[count] ?? FIRST;
  return {
    count,
    tokens: new Uint32Array(shard, HEADER_WORDS * WORD_BYTES, count),
    offsets,
    ordinals: new Uint32Array(shard, words * WORD_BYTES, total),
    channels: new Uint16Array(shard, words * WORD_BYTES + total * ORDINAL_BYTES, total),
  };
};

const viewAt = (layout: ShardLayout, index: number): PostingView => {
  const from = layout.offsets[index] ?? FIRST;
  const upTo = layout.offsets[index + NEXT] ?? FIRST;
  return {
    ordinals: layout.ordinals.subarray(from, upTo),
    channels: layout.channels.subarray(from, upTo),
  };
};

type Search = Readonly<{ layout: ShardLayout; token: number; low: number; high: number }>;

const findToken = (search: Search): Option.Option<number> => {
  const { layout, token, low, high } = search;
  if (low > high) {
    return Option.none();
  }
  const middle = Math.floor((low + high) / HALF);
  const found = layout.tokens[middle] ?? FIRST;
  if (found === token) {
    return Option.some(middle);
  }
  return Boolean.match(found < token, {
    onTrue: () => findToken({ ...search, low: middle + NEXT }),
    onFalse: () => findToken({ ...search, high: middle - NEXT }),
  });
};

const indexOfToken = (layout: ShardLayout, token: number): Option.Option<number> =>
  findToken({ layout, token, low: FIRST, high: layout.count - NEXT });

const postingsIn = ({
  shard,
  token,
}: Readonly<{ shard: Readonly<ArrayBuffer>; token: number }>): Option.Option<PostingView> => {
  const layout = layoutOf(shard);
  return Option.map(indexOfToken(layout, token), (index) => viewAt(layout, index));
};

const tokensIn = (
  shard: Readonly<ArrayBuffer>,
): readonly Readonly<{ token: number; view: PostingView }>[] => {
  const layout = layoutOf(shard);
  return Array.makeBy(layout.count, (index) => ({
    token: layout.tokens[index] ?? FIRST,
    view: viewAt(layout, index),
  }));
};

type Placed = Readonly<{ offset: number; count: number }>;

type RangeSearch<Piece extends Placed> = Readonly<{
  pieces: readonly Piece[];
  ordinal: number;
  low: number;
  high: number;
}>;

const findRange = <Piece extends Placed>(search: RangeSearch<Piece>): Option.Option<Piece> => {
  const { pieces, ordinal, low, high } = search;
  const middle = Math.floor((low + high) / HALF);
  return Option.flatMap(
    Option.filter(Option.fromUndefinedOr(pieces[middle]), () => low <= high),
    (piece) => {
      if (ordinal < piece.offset) {
        return findRange({ ...search, high: middle - NEXT });
      }
      if (ordinal >= piece.offset + piece.count) {
        return findRange({ ...search, low: middle + NEXT });
      }
      return Option.some(piece);
    },
  );
};

const rangeAt = <Piece extends Placed>({
  pieces,
  ordinal,
}: Readonly<{ pieces: readonly Piece[]; ordinal: number }>): Option.Option<Piece> =>
  findRange({ pieces, ordinal, low: FIRST, high: pieces.length - NEXT });

export { encodeShard, postingsIn, rangeAt, shardCountOf, shardOf, tokensIn };
export type { Placed, PostingView, Postings, TokenPostings };
