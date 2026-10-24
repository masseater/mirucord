import { Array, Effect, Option, pipe } from "effect";

import type { Grouped } from "#/entities/guild-message/lib/clusters";
import { blockOf, encodeBlock } from "#/entities/guild-message/lib/vector-block";
import type { VectorEntry } from "#/entities/guild-message/lib/vector-block";
import { decodeVector } from "#/shared/ai";
import { openBytes, sealBytes } from "#/shared/crypto/index.server";

import { vectorFileKey } from "./search-files.server";
import type { StoredFile } from "./search-files.server";
import type { Segment } from "./search-ledger.server";
import { vectorContext } from "./vector-embed.server";
import type { Keys } from "./vector-embed.server";
import type { StoredVector } from "./vector-ledger.server";

const EMPTY = 0;

type SealedVector = Readonly<{ ordinal: number; channelId: string; id: string; bytes: Uint8Array }>;

type NamedBlock = Readonly<{ file: string; entries: readonly VectorEntry[] }>;

const sealedVectors = (
  segment: Segment,
  stored: readonly StoredVector[],
): readonly SealedVector[] => {
  const ordinals = new Map(
    pipe(
      segment.ids,
      Array.map((id, ordinal) => [id, ordinal]),
    ),
  );
  return pipe(
    stored,
    Array.flatMap(({ id, channelId, vector }) =>
      Option.fromNullOr(vector).pipe(
        Option.filter((bytes) => bytes.length > EMPTY),
        Option.flatMap((bytes) =>
          Option.map(Option.fromUndefinedOr(ordinals.get(id)), (ordinal) => ({
            ordinal,
            channelId,
            id,
            bytes,
          })),
        ),
        Option.toArray,
      ),
    ),
  );
};

const openEntries = ({
  keys,
  segment,
  stored,
}: Readonly<{ keys: Keys; segment: Segment; stored: readonly StoredVector[] }>): Effect.Effect<
  readonly VectorEntry[]
> =>
  pipe(
    sealedVectors(segment, stored),
    Effect.forEach(({ ordinal, channelId, id, bytes }) =>
      openBytes({
        bytes,
        key: keys.key,
        context: vectorContext({ guildId: keys.guildId, messageId: id }),
      }).pipe(
        Effect.map((opened) =>
          Option.map(decodeVector(opened), (vector): VectorEntry => ({
            ordinal,
            channelId,
            vector,
          })),
        ),
      ),
    ),
    Effect.map(Array.getSomes),
  );

const namedBlocks = (through: number, grouped: Grouped): readonly NamedBlock[] =>
  pipe(
    grouped.clusters,
    Array.map((entries, cluster) => ({ file: `v${through}-${cluster}`, entries })),
  );

const sealFiles = ({
  keys,
  segment,
  through,
  grouped,
}: Readonly<{
  keys: Keys;
  segment: Segment;
  through: number;
  grouped: Grouped;
}>): Effect.Effect<readonly StoredFile[]> =>
  pipe(
    namedBlocks(through, grouped),
    Effect.forEach(({ file, entries }) => {
      const key = vectorFileKey({ guildId: keys.guildId, segment: segment.name, file });
      return encodeBlock(blockOf(entries)).pipe(
        Effect.flatMap((bytes) => sealBytes({ bytes, key: keys.key, context: key })),
        Effect.map((sealed): StoredFile => ({ key, body: Uint8Array.from(sealed).buffer })),
      );
    }),
  );

export { openEntries, sealFiles };
