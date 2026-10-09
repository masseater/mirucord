import { env } from "cloudflare:workers";
import { Config, ConfigProvider, Effect, Option, Redacted } from "effect";

import { postWebhookMessage } from "#/shared/discord/index.server";

const webhookUrl: Effect.Effect<Option.Option<string>> = Config.option(
  Config.Redacted("ALERT_WEBHOOK_URL"),
)
  .parse(ConfigProvider.fromUnknown(env))
  .pipe(Effect.map(Option.map(Redacted.value)), Effect.orDie);

const alertOperators = (content: string): Effect.Effect<void> =>
  Effect.logError(content).pipe(
    Effect.andThen(webhookUrl),
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.void,
        onSome: (url) =>
          postWebhookMessage({ webhookUrl: url, content }).pipe(
            Effect.catchTag("DiscordRequestError", () =>
              Effect.logError("Could not deliver an operator alert"),
            ),
          ),
      }),
    ),
  );

export { alertOperators };
