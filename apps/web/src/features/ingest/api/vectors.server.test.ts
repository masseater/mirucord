import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { Array, Data, Effect } from "effect";
import { beforeEach, expect, vi } from "vite-plus/test";

import { deleteVectors } from "./vectors.server";

const MAX_DELETE_IDS = 100;
const CHANNEL_SIZE = 250;
const IDS = Array.makeBy(CHANNEL_SIZE, (index) => `vector-${String(index)}`);

class TooManyIdsError extends Data.TaggedError("TooManyIdsError") {}

const deleted = new Set<string>();

beforeEach(() => {
  deleted.clear();
  vi.spyOn(env.MESSAGES, "deleteByIds").mockImplementation((ids) =>
    Effect.runPromise(
      Effect.succeed(ids).pipe(
        Effect.filterOrFail(
          (chunk) => chunk.length <= MAX_DELETE_IDS,
          () => new TooManyIdsError(),
        ),
        Effect.map((chunk) => {
          for (const id of chunk) {
            deleted.add(id);
          }
          return { mutationId: "test" };
        }),
      ),
    ),
  );
});

it.effect("deletes more vectors than one Vectorize call accepts", () =>
  Effect.gen(function* deleteMany() {
    yield* deleteVectors(IDS);
    expect(deleted).toStrictEqual(new Set(IDS));
  }),
);
