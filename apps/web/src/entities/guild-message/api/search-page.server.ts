import { Array, Effect, Option, pipe, Schema } from "effect";

import { readChunk } from "#/entities/guild-message/lib/search-query";
import type { Hit } from "#/entities/guild-message/lib/search-query";
import { CHUNK_SIZE, chunkOf } from "#/entities/guild-message/lib/search-segment";
import type { SealedEntry } from "#/entities/guild-message/lib/search-segment";

import { cachedBytes } from "./search-cache.server.ts";
import type { FileGate, FileRead } from "./search-cache.server.ts";
import { chunkKey } from "./search-files.server.ts";

const taggedError = Schema.TaggedError;

export class MissingFile extends taggedError<MissingFile, { readonly brand: unique symbol }>()(
  "MissingFile",
  {
    key: Schema.String,
  },
) {}

export const required = (read: FileRead): Effect.Effect<ArrayBuffer, MissingFile> =>
  Effect.fromOption(read.bytes).pipe(Effect.mapError(() => MissingFile.make({ key: read.key })));

const textDecoder = new TextDecoder();

type ChunkRef = Readonly<{ segment: string; chunk: number }>;

const chunkId = ({ segment, chunk }: ChunkRef): string => `${segment}/${chunk}`;

type LoadedChunk = Readonly<{ id: string; entries: readonly SealedEntry[]; read: FileRead }>;

const loadChunk = (
  guildId: string,
  ref: ChunkRef,
): Effect.Effect<LoadedChunk, MissingFile, FileGate> =>
  cachedBytes(chunkKey({ guildId, ...ref })).pipe(
    Effect.flatMap((read) =>
      required(read).pipe(
        Effect.flatMap((bytes) => readChunk(textDecoder.decode(bytes))),
        Effect.map((entries) => ({ id: chunkId(ref), entries, read })),
      ),
    ),
  );

export type LoadedPage = Readonly<{ entries: readonly SealedEntry[]; reads: readonly FileRead[] }>;

const entryAt = (
  chunks: readonly LoadedChunk[],
  { segment, ordinal }: Hit,
): Option.Option<SealedEntry> => {
  const id = chunkId({ segment, chunk: chunkOf(ordinal) });
  return pipe(
    chunks,
    Array.findFirst((chunk) => chunk.id === id),
    Option.flatMap(({ entries }) => Option.fromUndefinedOr(entries[ordinal % CHUNK_SIZE])),
  );
};

export const loadPage = ({
  guildId,
  page,
}: Readonly<{ guildId: string; page: readonly Hit[] }>): Effect.Effect<
  LoadedPage,
  MissingFile,
  FileGate
> =>
  Effect.forEach(
    pipe(
      page,
      Array.map(({ segment, ordinal }) => ({ segment, chunk: chunkOf(ordinal) })),
      Array.dedupeWith((left, right) => chunkId(left) === chunkId(right)),
    ),
    (ref) => loadChunk(guildId, ref),
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((chunks) => ({
      entries: pipe(
        page,
        Array.flatMap((hit) => Option.toArray(entryAt(chunks, hit))),
      ),
      reads: pipe(
        chunks,
        Array.map(({ read }) => read),
      ),
    })),
  );
