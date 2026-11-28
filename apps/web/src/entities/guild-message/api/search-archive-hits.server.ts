import { Array, Number, Option, Order, pipe, Record } from "effect";

import { matchPostings } from "#/entities/guild-message/lib/search-query";
import type { SealedHits } from "#/entities/guild-message/lib/search-query";
import { rangeAt } from "#/entities/guild-message/lib/search-shard";
import type { PostingView } from "#/entities/guild-message/lib/search-shard";

import type { ArchiveEntry, SearchHead } from "./search-files.server.ts";

type LivePiece = Readonly<{
  name: string;
  offset: number;
  count: number;
  from: number;
}>;

const byOffset = Order.mapInput(Number.Order, ({ offset }: LivePiece) => offset);

const invalidIn = (head: SearchHead, name: string): ReadonlySet<number> =>
  new Set(Option.getOrElse(Record.get(head.invalid, name), () => []));

const livePieces = (head: SearchHead, archive: ArchiveEntry): readonly LivePiece[] => {
  const entries = new Map(
    pipe(
      head.segments,
      Array.map((entry) => [entry.name, entry]),
    ),
  );
  const live = pipe(
    archive.pieces,
    Array.flatMap(({ name, offset }) => {
      const entry = Option.fromUndefinedOr(entries.get(name));
      return pipe(
        Option.toArray(entry),
        Array.map(({ count, from }) => ({ name, offset, count, from })),
      );
    }),
  );
  return Array.sort(live, byOffset);
};

const groupByPiece = (
  pieces: readonly LivePiece[],
  ordinals: readonly number[],
): readonly SealedHits[] => {
  const grouped = new Map<string, Readonly<{ piece: LivePiece; ordinals: number[] }>>();
  for (const ordinal of ordinals) {
    for (const piece of Option.toArray(rangeAt({ pieces, ordinal }))) {
      grouped
        .getOrInsertComputed(piece.name, () => ({ piece, ordinals: [] }))
        .ordinals.push(ordinal - piece.offset);
    }
  }
  return pipe(
    Array.fromIterable(grouped.values()),
    Array.map(({ piece, ordinals: local }) => ({
      segment: piece.name,
      from: piece.from,
      ordinals: local,
    })),
  );
};

export type ArchiveScan = Readonly<{
  head: SearchHead;
  archive: ArchiveEntry;
  allowed: Option.Option<ReadonlySet<number>>;
  views: Option.Option<readonly PostingView[]>;
}>;

export const archivedHits = ({
  head,
  archive,
  allowed,
  views,
}: ArchiveScan): readonly SealedHits[] => {
  const pieces = livePieces(head, archive);
  const invalid = new Map(
    pipe(
      pieces,
      Array.map(({ name }) => [name, invalidIn(head, name)]),
    ),
  );
  const isHidden = (ordinal: number): boolean =>
    Option.match(rangeAt({ pieces, ordinal }), {
      onNone: () => true,
      onSome: ({ name, offset }) =>
        Option.exists(Option.fromUndefinedOr(invalid.get(name)), (set) =>
          set.has(ordinal - offset),
        ),
    });
  return Option.match(views, {
    onNone: () => [],
    onSome: (found) =>
      groupByPiece(
        pieces,
        matchPostings({
          views: found,
          filter: { allowed, skipped: isHidden },
        }),
      ),
  });
};
