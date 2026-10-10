import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { Array, Effect } from "effect";
import { beforeEach, expect, vi } from "vite-plus/test";

import { deleteVectors } from "./vectors.server";

const MAX_DELETE_IDS = 100;
const CHANNEL_SIZE = 250;
const IDS = Array.makeBy(CHANNEL_SIZE, (index) => `vector-${String(index)}`);

const deleted = new Set<string>();

beforeEach(() => {
  deleted.clear();
  vi.spyOn(env.MESSAGES, "deleteByIds").mockImplementation((ids) => {
    expect(ids.length).toBeLessThanOrEqual(MAX_DELETE_IDS);
    for (const id of ids) {
      deleted.add(id);
    }
    return Promise.resolve({ mutationId: "test" });
  });
});

it.effect("deletes more vectors than one Vectorize call accepts", () =>
  Effect.gen(function* deleteMany() {
    yield* deleteVectors(IDS);
    expect(deleted).toStrictEqual(new Set(IDS));
  }),
);
