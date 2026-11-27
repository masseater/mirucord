import { Effect, Schema } from "effect";

const NO_CONTENT = "";

const MessageText = Schema.String.pipe(Schema.withDecodingDefaultKey(Effect.succeed(NO_CONTENT)));

const Attachment = Schema.Struct({
  filename: Schema.String,
  url: Schema.String,
  size: Schema.Finite,
  content_type: Schema.optional(Schema.String),
});

const EmbedField = Schema.Struct({ name: Schema.String, value: Schema.String });

const Embed = Schema.Struct({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  fields: EmbedField.pipe(Schema.Array, Schema.optional),
});

const noEmbeds = Effect.succeed<readonly never[]>([]);

const Embeds = Schema.Array(Embed).pipe(Schema.withDecodingDefaultKey(noEmbeds));

const StickerItem = Schema.Struct({ name: Schema.String });

const StickerItems = StickerItem.pipe(Schema.Array, Schema.optional);

const PollMedia = Schema.Struct({ text: Schema.optional(Schema.String) });

const Poll = Schema.Struct({
  question: PollMedia,
  answers: Schema.Array(Schema.Struct({ poll_media: PollMedia })),
});

export const Author = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.String.pipe(Schema.NullOr, Schema.optional),
  bot: Schema.optional(Schema.Boolean),
});

const noMentions = Effect.succeed<readonly never[]>([]);

const Mentions = Schema.Array(Author).pipe(Schema.withDecodingDefaultKey(noMentions));

const MessageReference = Schema.Struct({
  type: Schema.optional(Schema.Finite),
  message_id: Schema.optional(Schema.String),
  channel_id: Schema.optional(Schema.String),
});

const MessageSnapshot = Schema.Struct({
  message: Schema.Struct({
    content: MessageText,
    attachments: Schema.Array(Attachment),
    embeds: Embeds,
    sticker_items: StickerItems,
  }),
});

export const Message = Schema.Struct({
  id: Schema.String,
  type: Schema.Finite,
  content: MessageText,
  timestamp: Schema.DateTimeUtcFromString,
  edited_timestamp: Schema.NullOr(Schema.DateTimeUtcFromString),
  author: Author,
  mentions: Mentions,
  message_reference: Schema.optional(MessageReference),
  webhook_id: Schema.optional(Schema.String),
  attachments: Schema.Array(Attachment),
  message_snapshots: MessageSnapshot.pipe(Schema.Array, Schema.optional),
  embeds: Embeds,
  sticker_items: StickerItems,
  poll: Schema.optional(Poll),
});

export type DiscordMessage = typeof Message.Type;
