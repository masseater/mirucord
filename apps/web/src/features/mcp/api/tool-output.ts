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
const Member = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  globalName: Schema.NullOr(Schema.String),
  nick: Schema.NullOr(Schema.String),
  roles: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  bot: Schema.Boolean,
  joinedAt: Schema.NullOr(Schema.String),
  leftAt: Schema.NullOr(Schema.String),
});
const ListMembersOutput = Schema.Struct({
  ingest: Schema.Literals(["consented", "notConsented"]),
  total: Schema.Int,
  members: Schema.Array(Member),
});
const VoiceMoment = Schema.Struct({
  at: Schema.String,
  precision: Schema.Literals(["exact", "noLaterThan"]),
});
const VoiceSession = Schema.Struct({
  userId: Schema.String,
  channelId: Schema.String,
  channelName: Schema.String,
  joined: VoiceMoment,
  left: Schema.NullOr(VoiceMoment),
});
const ListVoiceSessionsOutput = Schema.Struct({
  ingest: Schema.Literals(["consented", "notConsented"]),
  total: Schema.Int,
  sessions: Schema.Array(VoiceSession),
});
const Reaction = Schema.Struct({
  messageId: Schema.String,
  channelId: Schema.String,
  userId: Schema.String,
  messageAuthorId: Schema.NullOr(Schema.String),
  emoji: Schema.String,
  burst: Schema.Boolean,
  reactedAt: Schema.String,
});
const Vote = Schema.Struct({
  messageId: Schema.String,
  channelId: Schema.String,
  userId: Schema.String,
  answerId: Schema.Int,
  votedAt: Schema.String,
});
const LiveReaction = Schema.Struct({
  emoji: Schema.String,
  burst: Schema.Boolean,
  userIds: Schema.Array(Schema.String),
});
const LiveAnswer = Schema.Struct({
  answerId: Schema.Int,
  text: Schema.NullOr(Schema.String),
  userIds: Schema.Array(Schema.String),
});
const LiveMessage = Schema.Struct({
  authorId: Schema.String,
  reactions: Schema.Array(LiveReaction),
  votes: Schema.Array(LiveAnswer),
});
const ListReactionsOutput = Schema.Struct({
  ingest: Schema.Literals(["consented", "notConsented"]),
  reactionTotal: Schema.Int,
  reactions: Schema.Array(Reaction),
  voteTotal: Schema.Int,
  votes: Schema.Array(Vote),
  live: Schema.NullOr(LiveMessage),
});
const ScheduledEvent = Schema.Struct({
  eventId: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  channelId: Schema.NullOr(Schema.String),
  channelName: Schema.NullOr(Schema.String),
  creatorId: Schema.NullOr(Schema.String),
  location: Schema.NullOr(Schema.String),
  kind: Schema.String,
  status: Schema.String,
  startsAt: Schema.String,
  endsAt: Schema.NullOr(Schema.String),
  recurring: Schema.Boolean,
  removedAt: Schema.NullOr(Schema.String),
  interestedUserIds: Schema.Array(Schema.String),
});
const ListScheduledEventsOutput = Schema.Struct({
  ingest: Schema.Literals(["consented", "notConsented"]),
  total: Schema.Int,
  events: Schema.Array(ScheduledEvent),
  liveInterestedUserIds: Schema.NullOr(Schema.Array(Schema.String)),
});
const ThreadMember = Schema.Struct({
  threadId: Schema.String,
  threadName: Schema.NullOr(Schema.String),
  userId: Schema.String,
  joinedAt: Schema.String,
  leftAt: Schema.NullOr(Schema.String),
});
const ListThreadMembersOutput = Schema.Struct({
  ingest: Schema.Literals(["consented", "notConsented"]),
  total: Schema.Int,
  members: Schema.Array(ThreadMember),
  liveUserIds: Schema.NullOr(Schema.Array(Schema.String)),
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
  ListMembersOutput,
  ListReactionsOutput,
  ListScheduledEventsOutput,
  ListServerPhrasesOutput,
  ListServersOutput,
  ListThreadMembersOutput,
  ListVoiceSessionsOutput,
  ReadMessagesOutput,
};
