import { Array, Effect, Option, pipe, Record } from "effect";

import { matchPostings } from "#/entities/guild-message/lib/search-query";
import type { Filter } from "#/entities/guild-message/lib/search-query";
import { postingsIn, shardOf } from "#/entities/guild-message/lib/search-shard";
import type { PostingView } from "#/entities/guild-message/lib/search-shard";

import { cachedBytes } from "./search-cache.server";
import type { FileGate, FileRead } from "./search-cache.server";
import type { SearchHead } from "./search-files.server";
import { required } from "./search-page.server";
import type { MissingFile } from "./search-page.server";

const invalidOf = ({
  head,
  segment,
}: Readonly<{ head: SearchHead; segment: string }>): ReadonlySet<number> =>
  new Set(Option.getOrElse(Record.get(head.invalid, segment), () => []));

type ShardSet = Readonly<{ count: number; shardAt: (shard: number) => Option.Option<ArrayBuffer> }>;

const allViews = ({
  set,
  tokens,
}: Readonly<{ set: ShardSet; tokens: readonly number[] }>): Option.Option<
  readonly PostingView[]
> => {
  const viewOf = (token: number): Option.Option<PostingView> =>
    Option.flatMap(set.shardAt(shardOf({ token, shards: set.count })), (shard) =>
      postingsIn({ shard, token }),
    );
  return Option.all(
    pipe(
      tokens,
      Array.map((token) => viewOf(token)),
    ),
  );
};

const readShardSet = ({
  tokens,
  shardCount,
  keyOf,
}: Readonly<{
  tokens: readonly number[];
  shardCount: number;
  keyOf: (shard: number) => string;
}>): Effect.Effect<
  Readonly<{ set: ShardSet; reads: readonly FileRead[] }>,
  MissingFile,
  FileGate
> =>
  Effect.forEach(
    pipe(
      tokens,
      Array.map((token) => shardOf({ token, shards: shardCount })),
      Array.dedupe,
    ),
    (shard) =>
      cachedBytes(keyOf(shard)).pipe(
        Effect.flatMap((read) =>
          required(read).pipe(Effect.map((bytes) => ({ shard, bytes, read }))),
        ),
      ),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((loaded) => {
      const shards = new Map(
        pipe(
          loaded,
          Array.map(({ shard, bytes }) => [shard, bytes]),
        ),
      );
      return {
        set: { count: shardCount, shardAt: (shard) => Option.fromUndefinedOr(shards.get(shard)) },
        reads: pipe(
          loaded,
          Array.map(({ read }) => read),
        ),
      };
    }),
  );

const matched = ({
  views,
  filter,
}: Readonly<{ views: Option.Option<readonly PostingView[]>; filter: Filter }>): readonly number[] =>
  Option.match(views, {
    onNone: () => [],
    onSome: (found) => matchPostings({ views: found, filter }),
  });

export { allViews, invalidOf, matched, readShardSet };
export type { ShardSet };
