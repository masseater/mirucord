import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { eq } from "drizzle-orm";
import { Effect, Option } from "effect";
import { afterAll, beforeAll, expect } from "vite-plus/test";

import { db, linkedAccount } from "#/shared/db/index.server";

import {
  ACCESS_TOKEN,
  discordConnections,
  OWNER,
  revoked,
  seedConnectionsAccount,
  storedToken,
} from "./__tests__/connections-account";
import {
  loadLinkedAccounts,
  publishLinkedAccounts,
  withdrawLinkedAccounts,
} from "./linked-account-store.server";

const NO_TOKEN = Option.getOrNull(Option.none<string>());

const network = setupNetwork();

beforeAll(() => {
  network.enable();
  network.use(...discordConnections);
  return Effect.runPromise(seedConnectionsAccount());
});

afterAll(() => {
  network.disable();
});

const publishedRows = Effect.promise(() =>
  db
    .select({ type: linkedAccount.type, name: linkedAccount.name })
    .from(linkedAccount)
    .where(eq(linkedAccount.userId, OWNER.userId)),
);

it.effect("offers only public connections, publishes the chosen ones and lets the token go", () =>
  Effect.gen(function* flow() {
    const offered = yield* loadLinkedAccounts(OWNER);
    const result = yield* publishLinkedAccounts({
      owner: OWNER,
      selected: [
        { type: "github", name: "alice" },
        { type: "steam", name: "hidden" },
      ],
    });
    const rows = yield* publishedRows;
    const token = yield* storedToken;
    const after = yield* loadLinkedAccounts(OWNER);
    expect({ offered, result, rows, token, revoked, after }).toStrictEqual({
      offered: {
        status: "choosing",
        published: [],
        choices: [
          { type: "github", name: "alice", verified: true, published: false },
          { type: "youtube", name: "alice-tube", verified: false, published: false },
        ],
      },
      result: { status: "published", count: 1 },
      rows: [{ type: "github", name: "alice" }],
      token: [{ accessToken: NO_TOKEN, scope: "identify" }],
      revoked: [ACCESS_TOKEN],
      after: { status: "idle", published: [{ type: "github", name: "alice", verified: true }] },
    });
  }),
);

it.effect("removes everything when the owner withdraws", () =>
  Effect.gen(function* withdraw() {
    yield* withdrawLinkedAccounts(OWNER);
    expect(yield* publishedRows).toStrictEqual([]);
  }),
);
