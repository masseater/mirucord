import { env } from "cloudflare:workers";
import { Array, Effect, Option, pipe } from "effect";

import { deleteKeys } from "./search-files.server";

const COPY_CONCURRENCY = 8;

const listFrom = (
  bucket: Readonly<R2Bucket>,
  cursor: Option.Option<string>,
): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    bucket.list(Option.match(cursor, { onNone: () => ({}), onSome: (from) => ({ cursor: from }) })),
  ).pipe(
    Effect.flatMap((page) => {
      const keys = pipe(
        page.objects,
        Array.map(({ key }) => key),
      );
      return Option.match(
        Option.liftPredicate(page, (listed) => listed.truncated),
        {
          onNone: () => Effect.succeed(keys),
          onSome: (more) =>
            listFrom(bucket, Option.some(more.cursor)).pipe(
              Effect.map((rest) => [...keys, ...rest]),
            ),
        },
      );
    }),
  );

type Route = Readonly<{ from: Readonly<R2Bucket>; to: Readonly<R2Bucket> }>;

const copyOne = ({ from, to }: Route, key: string): Effect.Effect<void> =>
  Effect.promise(() => from.get(key)).pipe(
    Effect.map(Option.fromNullOr),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (object) =>
          Effect.promise(() => object.arrayBuffer()).pipe(
            Effect.flatMap((body) => Effect.promise(() => to.put(key, body))),
            Effect.asVoid,
          ),
      }),
    ),
  );

const without = (keys: readonly string[], present: readonly string[]): readonly string[] => {
  const held = new Set(present);
  return pipe(
    keys,
    Array.filter((key) => !held.has(key)),
  );
};

export const moveLegacySearch: Effect.Effect<void> = Effect.gen(function* moveLegacySearch() {
  const route: Route = { from: env.SEARCH_LEGACY, to: env.SEARCH };
  const legacy = yield* listFrom(route.from, Option.none());
  const present = yield* listFrom(route.to, Option.none());
  const missing = without(legacy, present);
  yield* Effect.forEach(missing, (key) => copyOne(route, key), {
    concurrency: COPY_CONCURRENCY,
    discard: true,
  });
  const after = yield* listFrom(route.to, Option.none());
  const lost = without(legacy, after);
  const moved = Effect.logInfo("Legacy search files moved").pipe(
    Effect.annotateLogs({ copied: missing.length, legacy: legacy.length }),
  );
  yield* Array.match(lost, {
    onEmpty: () => deleteKeys({ bucket: route.from, keys: legacy }).pipe(Effect.andThen(moved)),
    onNonEmpty: (keys) =>
      Effect.logError("Legacy search files are not all copied yet").pipe(
        Effect.annotateLogs({ lost: keys.length }),
      ),
  });
});
