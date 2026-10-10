import { MutableHashMap, Option } from "effect";

const NO_SIMILARITY = 0;
const FIRST_INDEX = 0;
const FULL_SIMILARITY = 1;
const NO_TEXT = 0;
const EMBEDDING: readonly number[] = [FULL_SIMILARITY, NO_SIMILARITY, NO_SIMILARITY];

type Metadata = Readonly<Record<string, string>>;
type StoredVector = Readonly<{ id: string; values: readonly number[]; metadata: Metadata }>;
type Condition = string | Readonly<{ $in: readonly string[] }>;
type QueryOptions = Readonly<{ topK: number; filter: Readonly<Record<string, Condition>> }>;
type Embeddings = Readonly<{ data: readonly (readonly number[])[] }>;
type Mutation = Readonly<{ ids: readonly string[] }>;

const vectors = MutableHashMap.empty<string, StoredVector>();

const satisfies = (value: string | undefined, condition: Condition): boolean => {
  if (typeof condition === "string") {
    return value === condition;
  }
  return condition.$in.includes(value ?? "");
};

const matchesFilter = ({ metadata }: StoredVector, filter: QueryOptions["filter"]): boolean =>
  Object.entries(filter).every(([key, condition]) => satisfies(metadata[key], condition));

const matchesOf = (found: readonly Readonly<{ id: string }>[]): VectorizeMatches => ({
  matches: found.map(({ id }) => ({ id, score: FULL_SIMILARITY })),
  count: found.length,
});

const env = {
  AI: {
    run: (_model: string, { text }: Readonly<{ text: readonly string[] }>): Promise<Embeddings> => {
      if (text.length === NO_TEXT) {
        return Promise.reject(new Error("AiError: text must not be empty"));
      }
      return Promise.resolve({ data: text.map(() => EMBEDDING) });
    },
  },
  MESSAGES: {
    upsert: (upserted: readonly StoredVector[]): Promise<Mutation> => {
      for (const vector of upserted) {
        MutableHashMap.set(vectors, vector.id, vector);
      }
      return Promise.resolve({ ids: upserted.map(({ id }) => id) });
    },
    getByIds: (ids: readonly string[]): Promise<readonly StoredVector[]> =>
      Promise.resolve(ids.flatMap((id) => Option.toArray(MutableHashMap.get(vectors, id)))),
    deleteByIds: (ids: readonly string[]): Promise<Mutation> => {
      for (const id of ids) {
        MutableHashMap.remove(vectors, id);
      }
      return Promise.resolve({ ids });
    },
    query: (
      _vector: readonly number[],
      { topK, filter }: QueryOptions,
    ): Promise<VectorizeMatches> =>
      Promise.resolve(
        matchesOf(
          [...MutableHashMap.values(vectors)]
            .filter((vector) => matchesFilter(vector, filter))
            .slice(FIRST_INDEX, topK),
        ),
      ),
  },
  INGEST: {
    sendBatch: (_messages: readonly unknown[]): Promise<void> => Promise.resolve(),
  },
  DISCORD_BOT_TOKEN: `${btoa("900000000000000000")}.test.token`,
  MASTER_KEY: {
    get: (): Promise<string> => Promise.resolve("master-key-for-tests"),
  },
};

export { env, matchesOf };
