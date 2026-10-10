import { Array, Effect, Function } from "effect";

const ID_CHUNK = 50;
const DATA_FIRST_ARITY = 2;

type ChunkRun<Row> = (chunk: readonly string[]) => Promise<Row>;

const inIdChunksDataFirst = <Row>(
  ids: readonly string[],
  run: ChunkRun<Row>,
): Effect.Effect<readonly Row[]> =>
  Effect.forEach(Array.chunksOf(ids, ID_CHUNK), (chunk) => Effect.promise(() => run(chunk)));

const inIdChunks: {
  <Row>(run: ChunkRun<Row>): (ids: readonly string[]) => Effect.Effect<readonly Row[]>;
  <Row>(ids: readonly string[], run: ChunkRun<Row>): Effect.Effect<readonly Row[]>;
} = Function.dual(DATA_FIRST_ARITY, inIdChunksDataFirst);

export { inIdChunks };
export type { ChunkRun };
