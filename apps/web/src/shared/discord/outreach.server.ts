import { Discord, UI } from "dfx";
import { Array, Effect, Option, pipe, Schema, String as Str } from "effect";

import { decodeBody, withDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";

const WEBHOOK_PATH_PARTS = 2;

const NO_MENTIONS = { parse: [] };

const NullableId = Schema.optional(Schema.NullOr(Schema.String));

const AuditLogEntry = Schema.Struct({ target_id: NullableId, user_id: NullableId });

const AuditLog = Schema.Struct({ audit_log_entries: Schema.Array(AuditLogEntry) });

const Channel = Schema.Struct({ id: Schema.String });

const decodeAuditLog = decodeBody(AuditLog);

const decodeChannel = decodeBody(Channel);

const postWebhookMessage = ({
  webhookUrl,
  content,
}: Readonly<{ webhookUrl: string; content: string }>): Effect.Effect<void, DiscordRequestError> => {
  const [webhookId = "", token = ""] = Array.takeRight(
    pipe(new URL(webhookUrl).pathname, Str.split("/")),
    WEBHOOK_PATH_PARTS,
  );
  return withDiscord((rest) =>
    rest.executeWebhook(webhookId, token, {
      params: { wait: true },
      payload: { content, allowed_mentions: NO_MENTIONS },
    }),
  ).pipe(Effect.asVoid);
};

type OutgoingMessage = Readonly<{
  content: string;
  links?: readonly Readonly<{
    [Key in "label" | "url"]: NonNullable<Discord.ButtonComponentForMessageRequest[Key]>;
  }>[];
}>;

const linkRow = (
  links: NonNullable<OutgoingMessage["links"]>,
): Discord.ActionRowComponentForMessageRequest =>
  UI.row(
    pipe(
      links,
      Array.map(({ label, url }) =>
        UI.button({ style: Discord.ButtonStyleTypes.LINK, label, url }),
      ),
    ),
  );

const postChannelMessage = ({
  channelId,
  content,
  links = [],
}: OutgoingMessage & Readonly<{ channelId: string }>): Effect.Effect<void, DiscordRequestError> =>
  withDiscord((rest) =>
    rest.createMessage(channelId, {
      content,
      allowed_mentions: NO_MENTIONS,
      components: Option.liftPredicate(links, Array.isReadonlyArrayNonEmpty).pipe(
        Option.map(linkRow),
        Option.toArray,
      ),
    }),
  ).pipe(Effect.asVoid);

const openDirectChannel = (userId: string): Effect.Effect<string, DiscordRequestError> =>
  withDiscord((rest) => rest.createDm({ recipient_id: userId })).pipe(
    Effect.flatMap(decodeChannel),
    Effect.map(({ id }) => id),
  );

const sendDirectMessage = ({
  userId,
  ...message
}: OutgoingMessage & Readonly<{ userId: string }>): Effect.Effect<void, DiscordRequestError> =>
  openDirectChannel(userId).pipe(
    Effect.flatMap((channelId) => postChannelMessage({ channelId, ...message })),
  );

const findBotAdder = ({
  guildId,
  botUserId,
}: Readonly<{ guildId: string; botUserId: string }>): Effect.Effect<
  Option.Option<string>,
  DiscordRequestError
> =>
  withDiscord((rest) =>
    rest.listGuildAuditLogEntries(guildId, {
      action_type: Discord.AuditLogActionTypes.BOT_ADD,
    }),
  ).pipe(
    Effect.flatMap(decodeAuditLog),
    Effect.map(({ audit_log_entries }) =>
      Array.findFirst(audit_log_entries, ({ target_id }) => target_id === botUserId).pipe(
        Option.flatMap(({ user_id }) => Option.fromNullishOr(user_id)),
      ),
    ),
  );

export { findBotAdder, postChannelMessage, postWebhookMessage, sendDirectMessage };
export type { OutgoingMessage };
