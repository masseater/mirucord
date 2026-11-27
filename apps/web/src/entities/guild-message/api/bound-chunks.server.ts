import { Array, Function, pipe } from "effect";

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
