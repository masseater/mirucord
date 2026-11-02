import { Schema } from "effect";

import { MessageAttachment, MessageEmbed, MessagePoll } from "#/shared/discord";

const Ingest = Schema.Literals(["notConsented", "waiting", "backfilling", "done", "empty"]);
const Mention = Schema.Struct({ id: Schema.String, name: Schema.NullOr(Schema.String) });
const Message = Schema.Struct({
  id: Schema.String,
  channelId: Schema.String,
  author: Schema.String,
  authorId: Schema.String,
  mentions: Schema.Array(Mention),
  replyTo: Schema.NullOr(Schema.String),
  content: Schema.String,
  attachments: Schema.Array(MessageAttachment),
  embeds: Schema.Array(MessageEmbed),
  stickers: Schema.Array(Schema.String),
  poll: Schema.optional(MessagePoll),
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
  oldestStoredAt: Schema.NullOr(Schema.String),
});
const PendingChannel = Schema.Struct({ channelId: Schema.String, ingest: Ingest });

const ListServersOutput = Schema.Struct({ servers: Schema.Array(Server) });
const ListChannelsOutput = Schema.Struct({ channels: Schema.Array(Channel), hint: Schema.String });
const FindMessagesOutput = Schema.Struct({
  total: Schema.Int,
  messages: Schema.Array(Message),
  notFullyIngested: Schema.Array(PendingChannel),
});
const SimilarMessage = Schema.Struct({ ...Message.fields, score: Schema.Finite });
const FindSimilarMessagesOutput = Schema.Struct({
  messages: Schema.Array(SimilarMessage),
  embedded: Schema.Int,
  stored: Schema.Int,
  notFullyIngested: Schema.Array(PendingChannel),
});
const ServerPhrase = Schema.Struct({
  kind: Schema.Literals(["text", "emoji", "sticker"]),
  phrase: Schema.String,
  uses: Schema.Int,
  people: Schema.Int,
  lastUsedAt: Schema.String,
  channels: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  examples: Schema.Array(Schema.Array(Schema.String)),
  note: Schema.NullOr(Schema.String),
});
const ListServerPhrasesOutput = Schema.Struct({
  days: Schema.Int,
  phrases: Schema.Array(ServerPhrase),
});
const ReadMessagesOutput = Schema.Struct({
  ingest: Schema.optionalKey(Ingest),
  notFullyIngested: Schema.optionalKey(Schema.Array(PendingChannel)),
  messages: Schema.Array(Message),
});

export {
  FindMessagesOutput,
  FindSimilarMessagesOutput,
  ListChannelsOutput,
  ListServerPhrasesOutput,
  ListServersOutput,
  ReadMessagesOutput,
};
