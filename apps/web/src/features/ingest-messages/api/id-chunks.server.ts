import { inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { db } from "#/shared/db/index.server";
import type { channel, message } from "#/shared/db/index.server";

const ID_CHUNK = 50;

export const inIdChunks = <Row>({
  ids,
  run,
}: Readonly<{
  ids: readonly string[];
  run: (chunk: readonly string[]) => Promise<Row>;
}>): Effect.Effect<readonly Row[]> =>
  Effect.forEach(Array.chunksOf(ids, ID_CHUNK), (chunk) => Effect.promise(() => run(chunk)), {
    concurrency: 1,
  });

export const deleteByIds = ({
  table,
  ids,
}: Readonly<{
  table: typeof channel | typeof message;
  ids: readonly string[];
}>): Effect.Effect<readonly unknown[]> =>
  inIdChunks({
    ids,
    run: (chunk) => db.delete(table).where(inArray(table.id, [...chunk])),
  });

export const deleteAlong = ({
  table,
  ids,
  forget,
}: Readonly<{
  table: typeof channel | typeof message;
  ids: readonly string[];
  forget: Effect.Effect<void>;
}>): Effect.Effect<void> =>
  Effect.all([forget, deleteByIds({ table, ids })], { concurrency: 1, discard: true });
