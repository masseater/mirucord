import { waitUntil } from "cloudflare:workers";
import { Array, Effect, Option } from "effect";
import { Hex } from "effect/encoding";

import { guildStore, searchSimilar } from "#/entities/guild-message/index.server";
import { decodeVector, encodeVector } from "#/shared/ai";
import type { Quantized } from "#/shared/ai";
import { embedTexts } from "#/shared/ai/index.server";
import { SITE_ORIGIN } from "#/shared/config";
import { openGuildKey } from "#/shared/crypto/index.server";

import { openStored } from "./messages.server";
import type { MessageView } from "./messages.server";
import type { GuildScope } from "./scope.server";

const CACHE_NAME = "query-vectors";
const CACHE_CONTROL = "public, max-age=604800, immutable";
const NONE = 0;

type SimilarRequest = Readonly<{
  scope: GuildScope;
  query: string;
  channelIds: readonly string[];
  limit: number;
}>;

type Coverage = Readonly<{ stored: number; embedded: number }>;

type SimilarMessages =
  | Readonly<{
      status: "found";
      messages: readonly (MessageView & Readonly<{ score: number }>)[];
      coverage: Readonly<{ stored: number; embedded: number }>;
    }>
  | Readonly<{ status: "overBudget" }>;

const textEncoder = new TextEncoder();

const cacheUrlOf = (query: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", textEncoder.encode(query))).pipe(
    Effect.map((digest) => `${SITE_ORIGIN}/${CACHE_NAME}/${Hex.encode(new Uint8Array(digest))}`),
  );

const queryCache = Effect.promise(() => caches.open(CACHE_NAME));

const cachedVector = (url: string): Effect.Effect<Option.Option<Quantized>> =>
  queryCache.pipe(
    Effect.flatMap((cache) => Effect.promise(() => cache.match(url))),
    Effect.flatMap((response) =>
      Option.match(Option.fromUndefinedOr(response), {
        onNone: () => Effect.succeedNone,
        onSome: (found) =>
          Effect.promise(() => found.arrayBuffer()).pipe(
            Effect.map((bytes) => decodeVector(new Uint8Array(bytes))),
          ),
      }),
    ),
  );

const rememberVector = (url: string, vector: Quantized): Effect.Effect<void> => {
  const body = Uint8Array.from(encodeVector(vector)).buffer;
  const response = new Response(body, { headers: { "cache-control": CACHE_CONTROL } });
  return queryCache.pipe(Effect.flatMap((cache) => Effect.promise(() => cache.put(url, response))));
};

const embedQuery = (query: string): Effect.Effect<Option.Option<Quantized>> =>
  embedTexts({ priority: "query", texts: [query] }).pipe(
    Effect.map((embedded) => {
      if (embedded.status === "over-budget") {
        return Option.none();
      }
      return Array.head(embedded.vectors);
    }),
    Effect.orDie,
  );

const queryVector = (query: string): Effect.Effect<Option.Option<Quantized>> =>
  cacheUrlOf(query).pipe(
    Effect.flatMap((url) =>
      cachedVector(url).pipe(
        Effect.flatMap(
          Option.match({
            onSome: (vector) => Effect.succeedSome(vector),
            onNone: () =>
              embedQuery(query).pipe(
                Effect.tap(
                  Option.match({
                    onNone: () => Effect.void,
                    onSome: (vector) => rememberVector(url, vector),
                  }),
                ),
              ),
          }),
        ),
      ),
    ),
    Effect.withSpan("similar.queryVector"),
  );

const coverageOf = (guildId: string): Effect.Effect<Coverage> =>
  Effect.promise(() => guildStore(guildId).vectorCoverage());

const kickVectors = (guildId: string, coverage: Coverage): Effect.Effect<void> =>
  Effect.sync(() => {
    if (coverage.embedded < coverage.stored) {
      waitUntil(guildStore(guildId).refreshVectors());
    }
  });

const findSimilar = (request: SimilarRequest): Effect.Effect<SimilarMessages> => {
  const { guildId, wrappedKey } = request.scope.guild;
  return queryVector(request.query).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed<SimilarMessages>({ status: "overBudget" }),
        onSome: (query) =>
          Effect.all({
            key: openGuildKey(wrappedKey),
            coverage: coverageOf(guildId),
          }).pipe(
            Effect.tap(({ coverage }) => kickVectors(guildId, coverage)),
            Effect.flatMap(({ key, coverage }) =>
              searchSimilar({
                guildId,
                key,
                query,
                channelIds: request.channelIds,
                limit: request.limit,
              }).pipe(
                Effect.flatMap(({ entries }) =>
                  openStored({ scope: request.scope, stored: entries }).pipe(
                    Effect.map((views): SimilarMessages => {
                      const scores = new Map(entries.map(({ id, score }) => [id, score]));
                      return {
                        status: "found",
                        messages: views.map((view) => ({
                          ...view,
                          score: scores.get(view.id) ?? NONE,
                        })),
                        coverage,
                      };
                    }),
                  ),
                ),
              ),
            ),
          ),
      }),
    ),
  );
};

export { findSimilar };
export type { SimilarMessages, SimilarRequest };
