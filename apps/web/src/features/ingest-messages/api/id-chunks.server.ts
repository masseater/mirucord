import { inArray } from "drizzle-orm";
import { Array, Effect } from "effect";

import { channel, db, message } from "#/shared/db/index.server";

const ID_CHUNK = 50;

const TABLES = { channel, message } as const;

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
  from,
  ids,
}: Readonly<{ from: keyof typeof TABLES; ids: readonly string[] }>): Effect.Effect<
  readonly unknown[]
> =>
  inIdChunks({
    ids,
    run: (chunk) => db.delete(TABLES[from]).where(inArray(TABLES[from].id, [...chunk])),
  });
