import { it } from "@effect/vitest";
import { env } from "cloudflare:workers";
import { Array, Effect } from "effect";
import { expect, vi } from "vite-plus/test";

import { deleteVectors, indexedIds } from "./vectors.server";

vi.mock("cloudflare:workers", () => import("#/shared/__mocks__/index.workers"));

const CHANNEL_SIZE = 250;
const SIMILARITY = 1;
const VALUES = [SIMILARITY];
const IDS = Array.makeBy(CHANNEL_SIZE, (index) => `vector-${String(index)}`);

it.effect("deletes more vectors than one Vectorize call accepts", () =>
  Effect.gen(function* deleteMany() {
    yield* Effect.promise(() =>
      env.MESSAGES.upsert(
        IDS.map((id) => ({ id, values: VALUES, metadata: { guildId: "1", channelId: "2" } })),
      ),
    );
    yield* deleteVectors(IDS);
    expect(yield* indexedIds(IDS)).toStrictEqual(new Set());
  }),
);
