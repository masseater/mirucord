import { Array, Effect, Number, Option, Order, Schema } from "effect";

import { STAMP_BYTES } from "./search-layout";
import { SealedEntrySchema } from "./search-segment";
import type { SealedEntry } from "./search-segment";
import type { PostingView } from "./search-shard";

const FIRST = 0;
const NEXT = 1;
const HALF = 2;
const LITTLE_ENDIAN = true;
const BEFORE_EVERYTHING = -1;

const decodeChunkJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Array(SealedEntrySchema)));

const readChunk = (text: string): Effect.Effect<readonly SealedEntry[]> =>
  decodeChunkJson(text).pipe(Effect.orDie);

type RecentFile = Readonly<{ createdAt: Float64Array; index: ArrayBuffer }>;

const decodeRecent = (buffer: Readonly<ArrayBuffer>): RecentFile => {
  const count = new DataView(buffer).getUint32(FIRST, LITTLE_ENDIAN);
  const indexAt = STAMP_BYTES + count * STAMP_BYTES;
  return {
    createdAt: new Float64Array(buffer, STAMP_BYTES, count),
    index: buffer.slice(indexAt),
  };
};

type Filter = Readonly<{
  allowed: Option.Option<ReadonlySet<number>>;
  skipped: (ordinal: number) => boolean;
}>;

type Bound = Readonly<{ sorted: Uint32Array; value: number; from: number }>;

const lowerBound = ({ sorted, value, from }: Bound): number => {
  let low = from;
  let high = sorted.length;
  while (low < high) {
    const middle = Math.floor((low + high) / HALF);
    if ((sorted[middle] ?? FIRST) < value) {
      low = middle + NEXT;
    } else {
      high = middle;
    }
  }
  return low;
};

const intersectSorted = (kept: readonly number[], other: Uint32Array): readonly number[] => {
  const result: number[] = [];
  let at = FIRST;
  for (const ordinal of kept) {
    at = lowerBound({ sorted: other, value: ordinal, from: at });
    if (other[at] === ordinal) {
      result.push(ordinal);
    }
  }
  return result;
};

const keeps = (view: PostingView, index: number, { allowed, skipped }: Filter): boolean => {
  const channel = view.channels[index] ?? FIRST;
  const visible = Option.match(allowed, {
    onNone: () => true,
    onSome: (set) => set.has(channel),
  });
  return visible && !skipped(view.ordinals[index] ?? FIRST);
};

const allowedIn = (view: PostingView, filter: Filter): readonly number[] => {
  const kept: number[] = [];
  for (const [index, ordinal] of view.ordinals.entries()) {
    if (keeps(view, index, filter)) {
      kept.push(ordinal);
    }
  }
  return kept;
};

type Matching = Readonly<{ views: readonly PostingView[]; filter: Filter }>;

const matchPostings = ({ views, filter }: Matching): readonly number[] => {
  const [shortest, ...rest] = Array.sortWith(
    views,
    ({ ordinals }) => ordinals.length,
    Number.Order,
  );
  return Option.match(Option.fromUndefinedOr(shortest), {
    onNone: () => [],
    onSome: (first) => {
      let kept = allowedIn(first, filter);
      for (const other of rest) {
        kept = intersectSorted(kept, other.ordinals);
      }
      return kept;
    },
  });
};

type Hit = Readonly<{ segment: string; ordinal: number }>;

type SealedHits = Readonly<{ segment: string; from: number; ordinals: readonly number[] }>;

type RecentHits = Readonly<{
  segment: string;
  ordinals: readonly number[];
  createdAt: Float64Array;
}>;

type Ordering = Readonly<{
  recent: Option.Option<RecentHits>;
  sealed: readonly SealedHits[];
  offset: number;
  limit: number;
}>;

const byFromDesc = Order.flip(Order.mapInput(Number.Order, ({ from }: SealedHits) => from));

const recentStamp = (recent: RecentHits, position: number): number =>
  recent.createdAt[recent.ordinals[position] ?? FIRST] ?? FIRST;

const NO_RECENT: RecentHits = { segment: "", ordinals: [], createdAt: new Float64Array() };

type RecentFeeder = (from: number, room: number) => readonly Hit[];

const recentFeeder = (recent: Option.Option<RecentHits>): RecentFeeder => {
  const queue = Option.getOrElse(recent, () => NO_RECENT);
  let position = FIRST;
  const hasNext = (from: number): boolean =>
    position < queue.ordinals.length && recentStamp(queue, position) >= from;
  return (from, room) => {
    const fed: Hit[] = [];
    while (fed.length < room && hasNext(from)) {
      fed.push({ segment: queue.segment, ordinal: queue.ordinals[position] ?? FIRST });
      position += NEXT;
    }
    return fed;
  };
};

const orderedHits = ({ recent, sealed, offset, limit }: Ordering): readonly Hit[] => {
  const take = offset + limit;
  const picked: Hit[] = [];
  const nextRecent = recentFeeder(recent);
  for (const group of Array.sort(sealed, byFromDesc)) {
    picked.push(...nextRecent(group.from, take - picked.length));
    const room = Math.max(take - picked.length, FIRST);
    picked.push(
      ...group.ordinals.slice(FIRST, room).map((ordinal) => ({ segment: group.segment, ordinal })),
    );
  }
  picked.push(...nextRecent(BEFORE_EVERYTHING, take - picked.length));
  return picked.slice(offset);
};

export { decodeRecent, matchPostings, orderedHits, readChunk };
export type { Filter, Hit, Matching, Ordering, RecentFile, RecentHits, SealedHits };
