import type { APIAttachment } from "discord-api-types/v10";
import { Schema } from "effect";

const MessageAttachment = Schema.Struct({
  filename: Schema.String,
  url: Schema.String,
  description: Schema.optionalKey(Schema.String),
}) satisfies Schema.Decoder<Pick<APIAttachment, "filename" | "url" | "description">>;

const MessageEmbed = Schema.Struct({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  fields: Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String })),
});

const MessagePoll = Schema.Struct({
  question: Schema.String,
  answers: Schema.Array(Schema.String),
});

export { MessageAttachment, MessageEmbed, MessagePoll };
