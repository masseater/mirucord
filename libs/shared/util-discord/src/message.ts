import { MessageType } from "discord-api-types/v10";
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
  fields: Schema.optional(Schema.Array(EmbedField)),
});

const noEmbeds = Effect.succeed<readonly never[]>([]);

const Embeds = Schema.Array(Embed).pipe(Schema.withDecodingDefaultKey(noEmbeds));

const StickerItem = Schema.Struct({ name: Schema.String });

const StickerItems = Schema.optional(Schema.Array(StickerItem));

const PollMedia = Schema.Struct({ text: Schema.optional(Schema.String) });

const Poll = Schema.Struct({
  question: PollMedia,
  answers: Schema.Array(Schema.Struct({ poll_media: PollMedia })),
});

const Author = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.optional(Schema.NullOr(Schema.String)),
});

const MessageSnapshot = Schema.Struct({
  message: Schema.Struct({
    content: MessageText,
    attachments: Schema.Array(Attachment),
    embeds: Embeds,
    sticker_items: StickerItems,
  }),
});

const Message = Schema.Struct({
  id: Schema.String,
  type: Schema.Enum(MessageType),
  content: MessageText,
  timestamp: Schema.DateTimeUtcFromString,
  edited_timestamp: Schema.NullOr(Schema.DateTimeUtcFromString),
  author: Author,
  attachments: Schema.Array(Attachment),
  message_snapshots: Schema.optional(Schema.Array(MessageSnapshot)),
  embeds: Embeds,
  sticker_items: StickerItems,
  poll: Schema.optional(Poll),
});

type DiscordMessage = typeof Message.Type;

export { Message };
export type { DiscordMessage };
