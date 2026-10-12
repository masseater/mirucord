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

const Author = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.optional(Schema.NullOr(Schema.String)),
});

const MessageSnapshot = Schema.Struct({
  message: Schema.Struct({
    content: MessageText,
    attachments: Schema.Array(Attachment),
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
});

export { Message };
