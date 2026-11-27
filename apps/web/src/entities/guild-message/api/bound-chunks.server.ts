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
