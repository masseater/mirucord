import { Schema } from "effect";

const Ingest = Schema.Literals(["notConsented", "waiting", "backfilling", "done", "empty"]);
const Attachment = Schema.Struct({ filename: Schema.String, url: Schema.String });
const Message = Schema.Struct({
  id: Schema.String,
  channelId: Schema.String,
  author: Schema.String,
  content: Schema.String,
  attachments: Schema.Array(Attachment),
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
const SearchMessagesOutput = Schema.Struct({
  messages: Schema.Array(Message),
  notFullyIngested: Schema.Array(PendingChannel),
});
const FindMessagesOutput = Schema.Struct({
  total: Schema.Int,
  messages: Schema.Array(Message),
  notFullyIngested: Schema.Array(PendingChannel),
});
const ReadMessagesOutput = Schema.Struct({ ingest: Ingest, messages: Schema.Array(Message) });

export {
  FindMessagesOutput,
  ListChannelsOutput,
  ListServersOutput,
  ReadMessagesOutput,
  SearchMessagesOutput,
};
