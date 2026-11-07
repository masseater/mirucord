import { it } from "@effect/vitest";
import { setupNetwork } from "@msw/cloudflare";
import { env } from "cloudflare:workers";
import { Array, Effect, pipe } from "effect";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, expect, vi } from "vite-plus/test";

import {
  AWAITING,
  CAUGHT_UP,
  CAUGHT_UP_CHANNEL,
  GRANTED,
  JOBS_OUTSIDE_SCOPE,
  READABLE,
  seedScenario,
} from "./__tests__/consent-scenario";
import { refreshIngest, refreshPendingIngest } from "./consent-scope.server";
import { ingestChannel } from "./ingest-channel.server";

const queuedBy = (
  guildId: string,
  refresh: typeof refreshIngest = refreshIngest,
): Effect.Effect<readonly unknown[]> =>
  Effect.gen(function* queued() {
    const sendBatch = vi.spyOn(env.INGEST, "sendBatch");
    sendBatch.mockClear();
    yield* refresh(guildId).pipe(Effect.orDie);
    return pipe(
      sendBatch.mock.calls,
      Array.flatMap(([messages]) =>
        pipe(
          Array.fromIterable(messages),
          Array.map(({ body }) => body),
        ),
      ),
    );
  });

const network = setupNetwork();

const discordPathsDuring = <Failure>(
  work: Effect.Effect<void, Failure>,
): Effect.Effect<readonly string[], Failure> =>
  Effect.gen(function* fetched() {
    const paths: string[] = [];
    network.use(
      http.all("https://discord.com/*", ({ request }) => {
        paths.push(new URL(request.url).pathname);
        return HttpResponse.json([]);
      }),
    );
    yield* work;
    return paths;
  });

beforeAll(() => {
  network.enable();
  return Effect.runPromise(seedScenario);
});

afterEach(() => {
  network.resetHandlers();
});

afterAll(() => {
  network.disable();
});

it.effect("queues nothing for a server that has not consented", () =>
  Effect.gen(function* awaiting() {
    const queued = yield* queuedBy(AWAITING);
    expect(queued).toStrictEqual([]);
  }),
);

it.effect("queues only the readable channels of the consenting server", () =>
  Effect.gen(function* granted() {
    const queued = yield* queuedBy(GRANTED);
    expect(queued).toStrictEqual([{ guildId: GRANTED, channelId: READABLE }]);
  }),
);

it.effect("never fetches a channel outside consent, bot access, or its own server", () =>
  Effect.gen(function* outsideScope() {
    const paths = yield* discordPathsDuring(
      Effect.forEach(JOBS_OUTSIDE_SCOPE, ingestChannel, { discard: true }),
    );
    expect(paths).toStrictEqual([]);
  }),
);

it.effect("fetches a readable channel of a consenting server", () =>
  Effect.gen(function* inScope() {
    const paths = yield* discordPathsDuring(
      ingestChannel({ guildId: GRANTED, channelId: READABLE }),
    );
    expect(paths).toStrictEqual([`/api/v10/channels/${READABLE}/messages`]);
  }),
);

it.effect("leaves channels whose history is complete to the daily poll", () =>
  Effect.gen(function* pendingOnly() {
    const refreshed = yield* queuedBy(CAUGHT_UP, refreshPendingIngest);
    expect(refreshed).toStrictEqual([]);
    const polled = yield* queuedBy(CAUGHT_UP);
    expect(polled).toStrictEqual([{ guildId: CAUGHT_UP, channelId: CAUGHT_UP_CHANNEL }]);
  }),
);
