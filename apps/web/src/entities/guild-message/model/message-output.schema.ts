import { Schema } from "effect";

import { MessageAttachment, MessageEmbed, MessagePoll } from "#/shared/discord";

const Mention = Schema.Struct({
  id: Schema.String,
  name: Schema.NullOr(Schema.String).annotate({ description: "null when only the ID is known" }),
});

export const MessageOutput = Schema.Struct({
  id: Schema.String,
  channelId: Schema.String,
  author: Schema.String,
  authorId: Schema.String,
  mentions: Schema.Array(Mention),
  replyTo: Schema.NullOr(Schema.String).annotate({
    description: "The replied message's id. null for replies stored before 2026-11",
  }),
  content: Schema.String,
  attachments: Schema.Array(MessageAttachment),
  embeds: Schema.Array(MessageEmbed),
  stickers: Schema.Array(Schema.String),
  poll: Schema.optional(MessagePoll),
  createdAt: Schema.String,
  edited: Schema.Boolean,
  url: Schema.String,
});
