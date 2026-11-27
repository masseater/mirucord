import { Effect, Schema } from "effect";

import { MessageAttachment, MessageEmbed, MessagePoll } from "#/shared/discord";

import { typedEnvelope } from "./typed-envelope.server";
import type { Opener, Sealer } from "./typed-envelope.server";

const nothingYet = Effect.succeed<readonly never[]>([]);

const StoredEmbeds = Schema.Array(MessageEmbed).pipe(Schema.withDecodingDefaultKey(nothingYet));

const Stickers = Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(nothingYet));

const Mention = Schema.Struct({ id: Schema.String, name: Schema.String });

const Mentions = Schema.Array(Mention).pipe(Schema.withDecodingDefaultKey(nothingYet));

const MessageBodySchema = Schema.Struct({
  authorName: Schema.String,
  mentions: Mentions,
  replyTo: Schema.optional(Schema.String),
  content: Schema.String,
  attachments: Schema.Array(MessageAttachment),
  embeds: StoredEmbeds,
  stickers: Stickers,
  poll: Schema.optional(MessagePoll),
});

export type MessageBody = typeof MessageBodySchema.Type;

const MessageBodyJson = Schema.fromJsonString(MessageBodySchema);

export type MessageAddress = Readonly<{ guildId: string; channelId: string; messageId: string }>;

const envelope = typedEnvelope<MessageBody, MessageAddress, Schema.SchemaError, Schema.SchemaError>(
  {
    encode: Schema.encodeEffect(MessageBodyJson),
    decode: Schema.decodeEffect(MessageBodyJson),
    contextOf: ({ guildId, channelId, messageId }) => `${guildId}/${channelId}/${messageId}`,
  },
);

export const sealMessage: Sealer<MessageBody, MessageAddress> = envelope.seal;

export const openMessage: Opener<MessageBody, MessageAddress> = envelope.open;
