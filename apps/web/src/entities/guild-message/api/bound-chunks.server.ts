import { and, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { Array, Function, Option, pipe, Record } from "effect";

import { BOUND_LIMIT } from "#/entities/guild-message/model/guild-message.schema";

const DATA_FIRST_ARITY = 2;

const inChunksDataFirst = <Item, Row>(
  values: readonly Item[],
  query: (chunk: readonly Item[]) => readonly Row[],
): readonly Row[] => pipe(Array.chunksOf(values, BOUND_LIMIT), Array.flatMap(query));

export const inChunks: {
  <Item, Row>(
    query: (chunk: readonly Item[]) => readonly Row[],
  ): (values: readonly Item[]) => readonly Row[];
  <Item, Row>(
    values: readonly Item[],
    query: (chunk: readonly Item[]) => readonly Row[],
  ): readonly Row[];
} = Function.dual(DATA_FIRST_ARITY, inChunksDataFirst);

export const firstFound = <Row>({
  options,
  fallback,
}: Readonly<{
  options: readonly Option.Option<readonly Row[]>[];
  fallback: () => readonly Row[];
}>): readonly Row[] => pipe(Array.getSomes(options), Array.head, Option.getOrElse(fallback));

export const inChunksOf = <Row>({
  values,
  query,
}: Readonly<{
  values: readonly string[] | null;
  query: (chunk: readonly string[]) => readonly Row[];
}>): Option.Option<readonly Row[]> =>
  Option.map(Option.fromNullOr(values), (listed) => inChunks(listed, query));

const NO_COLUMNS = 0;
const MIN_ROWS = 1;

export const rowChunks = <Row extends Readonly<Record<string, unknown>>>(
  rows: readonly Row[],
): readonly (readonly Row[])[] => {
  const columns = Array.head(rows).pipe(
    Option.map((first) => Record.keys(first).length),
    Option.getOrElse(() => NO_COLUMNS),
  );
  return Array.chunksOf(rows, Math.max(MIN_ROWS, Math.floor(BOUND_LIMIT / columns)));
};

export type Deletion = Readonly<{
  db: DrizzleSqliteDODatabase;
  table: SQLiteTable;
  column: SQLiteColumn;
  values: readonly string[];
  only?: SQL;
}>;

export const deleteIn = ({ db, table, column, values, only }: Deletion): void => {
  const extra = Option.toArray(Option.fromUndefinedOr(only));
  for (const chunk of Array.chunksOf(values, BOUND_LIMIT)) {
    db.delete(table)
      .where(and(inArray(column, [...chunk]), ...extra))
      .run();
  }
};
