import { AuditLogEvent, Routes } from "discord-api-types/v10";
import { Array, Effect, Option, Schema } from "effect";

import { callDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";

const WEBHOOK_PATH_PARTS = 2;

const NullableId = Schema.optional(Schema.NullOr(Schema.String));

const AuditLogEntry = Schema.Struct({ target_id: NullableId, user_id: NullableId });

const AuditLog = Schema.Struct({ audit_log_entries: Schema.Array(AuditLogEntry) });

const Channel = Schema.Struct({ id: Schema.String });

const postWebhookMessage = ({
  webhookUrl,
  content,
}: Readonly<{ webhookUrl: string; content: string }>): Effect.Effect<void, DiscordRequestError> => {
  const [webhookId = "", token = ""] = Array.takeRight(
    new URL(webhookUrl).pathname.split("/"),
    WEBHOOK_PATH_PARTS,
  );
  return Effect.asVoid(
    callDiscord(Schema.Unknown)({
      method: "POST",
      route: Routes.webhook(webhookId, token),
      options: { body: { content, allowed_mentions: { parse: [] } }, unauthorized: true },
    }),
  );
};

const postChannelMessage = ({
  channelId,
  content,
}: Readonly<{ channelId: string; content: string }>): Effect.Effect<void, DiscordRequestError> =>
  Effect.asVoid(
    callDiscord(Schema.Unknown)({
      method: "POST",
      route: Routes.channelMessages(channelId),
      options: {
        body: { content, allowed_mentions: { parse: [] } },
        unauthorized: false,
      },
    }),
  );

const openDirectChannel = (userId: string): Effect.Effect<string, DiscordRequestError> =>
  callDiscord(Channel)({
    method: "POST",
    route: Routes.userChannels(),
    options: {
      body: { recipient_id: userId },
      unauthorized: false,
    },
  }).pipe(Effect.map(({ id }) => id));

const sendDirectMessage = ({
  userId,
  content,
}: Readonly<{ userId: string; content: string }>): Effect.Effect<void, DiscordRequestError> =>
  openDirectChannel(userId).pipe(
    Effect.flatMap((channelId) => postChannelMessage({ channelId, content })),
  );

const findBotAdder = ({
  guildId,
  botUserId,
}: Readonly<{ guildId: string; botUserId: string }>): Effect.Effect<
  Option.Option<string>,
  DiscordRequestError
> => {
  const query = new URLSearchParams({ action_type: String(AuditLogEvent.BotAdd) });
  return callDiscord(AuditLog)({
    method: "GET",
    route: `${Routes.guildAuditLog(guildId)}?${query.toString()}`,
  }).pipe(
    Effect.map(({ audit_log_entries }) =>
      Array.findFirst(audit_log_entries, ({ target_id }) => target_id === botUserId).pipe(
        Option.flatMap(({ user_id }) => Option.fromNullishOr(user_id)),
      ),
    ),
  );
};

export { findBotAdder, postChannelMessage, postWebhookMessage, sendDirectMessage };
