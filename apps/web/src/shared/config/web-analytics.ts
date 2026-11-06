import { Effect, Schema } from "effect";

const WEB_ANALYTICS_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com";

const encodeBeaconConfig = Schema.encodeEffect(
  Schema.fromJsonString(Schema.Struct({ token: Schema.String })),
);

const webAnalyticsBeacon = (
  token: string,
): Effect.Effect<Readonly<{ src: string; defer: true; "data-cf-beacon": string }>> =>
  encodeBeaconConfig({ token }).pipe(
    Effect.orDie,
    Effect.map((config) => ({
      src: `${WEB_ANALYTICS_SCRIPT_ORIGIN}/beacon.min.js`,
      defer: true,
      "data-cf-beacon": config,
    })),
  );

export { webAnalyticsBeacon };
