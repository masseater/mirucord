import { env } from "cloudflare:workers";
import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import { webAnalyticsBeacon } from "#/shared/config";

const escapeAttribute = (value: string): string =>
  pipe(value, Str.replaceAll("&", "&amp;"), Str.replaceAll('"', "&quot;"));

const attribute = ([name, value]: readonly [string, string | true]): string =>
  pipe(
    Option.liftPredicate(value, Str.isString),
    Option.match({
      onNone: () => name,
      onSome: (text) => `${name}="${escapeAttribute(text)}"`,
    }),
  );

const beaconTag = (token: string): Effect.Effect<string> =>
  webAnalyticsBeacon(token).pipe(
    Effect.map(
      (beacon) =>
        `<script ${pipe(Rec.toEntries(beacon), Arr.map(attribute), Arr.join(" "))}></script>`,
    ),
  );

const injectBeacon = (response: Response, tag: string): Response =>
  new HTMLRewriter()
    .on("head", {
      element: (head) => {
        head.append(tag, { html: true });
      },
    })
    .transform(response);

const withWebAnalytics = (response: Response): Effect.Effect<Response> =>
  pipe(
    Option.fromNullishOr(response.headers.get("Content-Type")),
    Option.filter(Str.startsWith("text/html")),
    Option.match({
      onNone: () => Effect.succeed(response),
      onSome: () =>
        beaconTag(env.CF_BEACON_TOKEN).pipe(Effect.map((tag) => injectBeacon(response, tag))),
    }),
  );

export { withWebAnalytics };
