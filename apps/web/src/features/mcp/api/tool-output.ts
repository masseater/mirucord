import { Schema } from "effect";

const Ingest = Schema.Literals(["notConsented", "waiting", "backfilling", "done", "empty"]);
const Attachment = Schema.Struct({
  filename: Schema.String,
  url: Schema.String,
  description: Schema.optional(Schema.String),
});
const Embed = Schema.Struct({
  title: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String),
  fields: Schema.Array(Schema.Struct({ name: Schema.String, value: Schema.String })),
});
const Poll = Schema.Struct({ question: Schema.String, answers: Schema.Array(Schema.String) });
const Message = Schema.Struct({
  id: Schema.String,
  channelId: Schema.String,
  author: Schema.String,
  content: Schema.String,
  attachments: Schema.Array(Attachment),
  embeds: Schema.Array(Embed),
  stickers: Schema.Array(Schema.String),
  poll: Schema.optional(Poll),
  createdAt: Schema.String,
  edited: Schema.Boolean,
  url: Schema.String,
});
const Server = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  ingest: Schema.Literals(["consented", "notConsented"]),
});
const Channel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.Int,
  parentId: Schema.NullOr(Schema.String),
  ingest: Ingest,
});
const PendingChannel = Schema.Struct({ channelId: Schema.String, ingest: Ingest });

const ListServersOutput = Schema.Struct({ servers: Schema.Array(Server) });
const ListChannelsOutput = Schema.Struct({ channels: Schema.Array(Channel) });
const FindMessagesOutput = Schema.Struct({
  total: Schema.Int,
  messages: Schema.Array(Message),
  notFullyIngested: Schema.Array(PendingChannel),
});
const ReadMessagesOutput = Schema.Struct({ ingest: Ingest, messages: Schema.Array(Message) });

export { FindMessagesOutput, ListChannelsOutput, ListServersOutput, ReadMessagesOutput };
