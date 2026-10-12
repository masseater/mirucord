import { Array, Boolean, Effect, Number, Option, Schema } from "effect";

import { POSTING_BYTES, STAMP_BYTES, WORD_BYTES } from "./search-layout";
import { SealedEntrySchema } from "./search-segment";
import type { SealedEntry } from "./search-segment";

const FIRST = 0;
const NONE = 0;
const NEXT = 1;
const HALF = 2;
const HEADER_WORDS = 1;
const LITTLE_ENDIAN = true;
const BEFORE_EVERYTHING = -1;

const textDecoder = new TextDecoder();

const decodeChunkJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Array(SealedEntrySchema)));

const MetaHeader = Schema.Struct({ count: Schema.Int, channels: Schema.Array(Schema.String) });

const decodeMetaHeader = Schema.decodeEffect(Schema.fromJsonString(MetaHeader));

type SegmentMeta = Readonly<{
  channels: readonly string[];
  createdAt: readonly number[];
  channelIndex: readonly number[];
}>;

const decodeMeta = (buffer: Readonly<ArrayBuffer>): Effect.Effect<SegmentMeta> => {
  const headerBytes = new DataView(buffer).getUint32(FIRST, LITTLE_ENDIAN);
  const start = Math.ceil((WORD_BYTES + headerBytes) / STAMP_BYTES) * STAMP_BYTES;
  return decodeMetaHeader(textDecoder.decode(new Uint8Array(buffer, WORD_BYTES, headerBytes))).pipe(
    Effect.orDie,
    Effect.map(({ count, channels }) => ({
      channels,
      createdAt: Array.fromIterable(new Float64Array(buffer, start, count)),
      channelIndex: Array.fromIterable(new Uint16Array(buffer, start + count * STAMP_BYTES, count)),
    })),
  );
};

const readChunk = (text: string): Effect.Effect<readonly SealedEntry[]> =>
  decodeChunkJson(text).pipe(Effect.orDie);

type TokenLookup = Readonly<{
  shard: Readonly<ArrayBuffer>;
  count: number;
  token: number;
  low: number;
  high: number;
}>;

const findToken = (lookup: TokenLookup): Option.Option<number> => {
  const { shard, count, token, low, high } = lookup;
  if (low > high) {
    return Option.none();
  }
  const middle = Math.floor((low + high) / HALF);
  const found = new Uint32Array(shard, WORD_BYTES * HEADER_WORDS, count)[middle] ?? NONE;
  if (found === token) {
    return Option.some(middle);
  }
  return Boolean.match(found < token, {
    onTrue: () => findToken({ ...lookup, low: middle + NEXT }),
    onFalse: () => findToken({ ...lookup, high: middle - NEXT }),
  });
};

const postingsOf = ({
  shard,
  token,
}: Readonly<{ shard: Readonly<ArrayBuffer>; token: number }>): readonly number[] => {
  const count = new DataView(shard).getUint32(FIRST, LITTLE_ENDIAN);
  const offsets = new Uint32Array(shard, WORD_BYTES * (HEADER_WORDS + count), count + NEXT);
  const postingsStart = WORD_BYTES * (HEADER_WORDS + count + count + NEXT);
  return Option.match(findToken({ shard, count, token, low: FIRST, high: count - NEXT }), {
    onNone: () => [],
    onSome: (index) => {
      const from = offsets[index] ?? NONE;
      const upTo = offsets[index + NEXT] ?? NONE;
      return Array.fromIterable(
        new Uint16Array(shard, postingsStart + from * POSTING_BYTES, upTo - from),
      );
    },
  });
};

const stepOf = (advance: boolean): number =>
  Boolean.match(advance, { onTrue: () => NEXT, onFalse: () => NONE });

const intersectTwo = (kept: readonly number[], other: readonly number[]): readonly number[] => {
  const found: number[] = [];
  let keptAt = FIRST;
  let otherAt = FIRST;
  while (keptAt < kept.length && otherAt < other.length) {
    const left = kept[keptAt] ?? NONE;
    const right = other[otherAt] ?? NONE;
    found.push(...Array.filter([left], () => left === right));
    keptAt += stepOf(left <= right);
    otherAt += stepOf(right <= left);
  }
  return found;
};

const intersectAll = (lists: readonly (readonly number[])[]): readonly number[] => {
  const [shortest, ...rest] = Array.sortWith(lists, (list) => list.length, Number.Order);
  let kept = Option.getOrElse(Option.fromUndefinedOr(shortest), (): readonly number[] => []);
  for (const other of rest) {
    kept = intersectTwo(kept, other);
  }
  return kept;
};

type SegmentQuery = Readonly<{
  meta: SegmentMeta;
  postings: readonly (readonly number[])[];
  invalid: readonly number[];
  channelIds: readonly string[];
}>;

const matchSegment = ({ meta, postings, invalid, channelIds }: SegmentQuery): readonly number[] => {
  const wanted = new Set(channelIds);
  const skipped = new Set(invalid);
  const allowed = new Set(
    meta.channels.flatMap((id, index) => Array.filter([index], () => wanted.has(id))),
  );
  return intersectAll(postings).filter(
    (ordinal) => !skipped.has(ordinal) && allowed.has(meta.channelIndex[ordinal] ?? NONE),
  );
};

type SegmentHits = Readonly<{
  segment: string;
  createdAt: readonly number[];
  ordinals: readonly number[];
}>;

type Hit = Readonly<{ segment: string; ordinal: number }>;

type Pick = Readonly<{ index: number; hit: Hit; stamp: number }>;

const headAt = (segments: readonly SegmentHits[], positions: readonly number[]): readonly Pick[] =>
  segments.flatMap(({ segment, createdAt, ordinals }, index) =>
    Option.toArray(
      Option.map(Option.fromUndefinedOr(ordinals[positions[index] ?? FIRST]), (ordinal) => ({
        index,
        hit: { segment, ordinal },
        stamp: createdAt[ordinal] ?? BEFORE_EVERYTHING,
      })),
    ),
  );

const pickNewest = (
  segments: readonly SegmentHits[],
  positions: readonly number[],
): Option.Option<Pick> => {
  let best = Option.none<Pick>();
  for (const candidate of headAt(segments, positions)) {
    if (
      Option.match(best, { onNone: () => true, onSome: ({ stamp }) => candidate.stamp > stamp })
    ) {
      best = Option.some(candidate);
    }
  }
  return best;
};

const newestFirst = ({
  segments,
  take,
}: Readonly<{ segments: readonly SegmentHits[]; take: number }>): readonly Hit[] => {
  const positions = segments.map(() => FIRST);
  const picked: Hit[] = [];
  let next = pickNewest(segments, positions);
  while (picked.length < take && Option.isSome(next)) {
    const { index, hit } = next.value;
    picked.push(hit);
    positions[index] = (positions[index] ?? FIRST) + NEXT;
    next = pickNewest(segments, positions);
  }
  return picked;
};

export { decodeMeta, matchSegment, newestFirst, postingsOf, readChunk };
export type { Hit, SegmentHits, SegmentMeta };
