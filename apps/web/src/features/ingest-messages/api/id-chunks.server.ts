import { inArray } from "drizzle-orm";
import { Array, Effect, Match } from "effect";

import { channel, db, message } from "#/shared/db/index.server";

const ID_CHUNK = 50;

const tableOf = (from: "channel" | "message"): typeof channel | typeof message =>
  Match.value(from).pipe(
    Match.when("channel", () => channel),
    Match.when("message", () => message),
    Match.exhaustive,
  );

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
}: Readonly<{ from: "channel" | "message"; ids: readonly string[] }>): Effect.Effect<
  readonly unknown[]
> =>
  inIdChunks({
    ids,
    run: (chunk) => {
      const table = tableOf(from);
      return db.delete(table).where(inArray(table.id, [...chunk]));
    },
  });
