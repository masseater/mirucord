import { Schema } from "effect";

import { PRECISIONS } from "#/entities/guild-message/index.server";
import { CONSENTS, INGEST_STATUSES } from "#/features/serve-mcp/model/ingest-status";
import { MessageAttachment, MessageEmbed, MessagePoll } from "#/shared/discord";

const Ingest = Schema.Literals(INGEST_STATUSES).annotate({
  description:
    "Only empty means no messages in Discord. Otherwise not everything is stored yet, so say so instead of reporting no messages",
});
const Consent = Schema.Literals(CONSENTS).annotate({
  description: "Nothing is stored before the admin allows it, so notConsented returns nothing",
});
const Mention = Schema.Struct({
  id: Schema.String,
  name: Schema.NullOr(Schema.String).annotate({ description: "null when only the ID is known" }),
});
const Message = Schema.Struct({
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
const Server = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  ingest: Schema.Literals(CONSENTS).annotate({
    description: "notConsented until the admin allows storing messages; every channel reads empty",
  }),
});
const Channel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.Int,
  parentId: Schema.NullOr(Schema.String),
  ingest: Ingest,
  oldestStoredAt: Schema.NullOr(Schema.String).annotate({
    description:
      "Nothing older is stored, so people missing before it may only be missing from the data",
  }),
});
const PendingChannel = Schema.Struct({ channelId: Schema.String, ingest: Ingest });

export const ListServersOutput = Schema.Struct({ servers: Schema.Array(Server) });
export const ListChannelsOutput = Schema.Struct({
  channels: Schema.Array(Channel),
  hint: Schema.String,
});
const NotFullyIngested = Schema.Array(PendingChannel).annotate({
  description: "Searched channels not fully stored yet, so counts may be low",
});
export const FindMessagesOutput = Schema.Struct({
  total: Schema.Int.annotate({
    description:
      "Matches in the searched channels. Queries over three characters may count a few partial matches",
  }),
  messages: Schema.Array(Message).annotate({
    description: "Exact matches among limit candidates, so it can hold fewer than limit",
  }),
  notFullyIngested: NotFullyIngested,
});
const SimilarMessage = Schema.Struct({
  ...Message.fields,
  score: Schema.Finite.annotate({ description: "Cosine similarity" }),
});
export const FindSimilarMessagesOutput = Schema.Struct({
  messages: Schema.Array(SimilarMessage).annotate({
    description:
      "The closest messages, even when none is about query. Read them before treating them as matches",
  }),
  embedded: Schema.Int.annotate({
    description:
      "Messages searchable by meaning so far. Older ones are added daily, so say so when below stored",
  }),
  stored: Schema.Int,
  notFullyIngested: NotFullyIngested,
});
const ServerPhrase = Schema.Struct({
  kind: Schema.Literals(["text", "emoji", "sticker"]),
  phrase: Schema.String,
  uses: Schema.Int,
  people: Schema.Int,
  lastUsedAt: Schema.String,
  channels: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  examples: Schema.Array(Schema.Array(Schema.String)).annotate({
    description: "Each with the message before it",
  }),
  note: Schema.NullOr(Schema.String).annotate({
    description: "AI-written line on how this server uses it",
  }),
});
export const ListServerPhrasesOutput = Schema.Struct({
  days: Schema.Int,
  phrases: Schema.Array(ServerPhrase).annotate({
    description:
      "The server's own greetings, reactions and in-jokes, not news. Common words are left out",
  }),
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
export const ListMembersOutput = Schema.Struct({
  ingest: Consent,
  total: Schema.Int,
  members: Schema.Array(Member),
});
const VoiceMoment = Schema.Struct({
  at: Schema.String,
  precision: Schema.Literals(PRECISIONS).annotate({
    description: "noLaterThan: learned after reconnecting, so the real time is at or before at",
  }),
});
const VoiceSession = Schema.Struct({
  userId: Schema.String,
  channelId: Schema.String,
  channelName: Schema.String,
  joined: VoiceMoment,
  left: Schema.NullOr(VoiceMoment).annotate({ description: "null while still there" }),
});
export const ListVoiceSessionsOutput = Schema.Struct({
  ingest: Consent,
  total: Schema.Int,
  sessions: Schema.Array(VoiceSession).annotate({
    description:
      "One person's stay in one channel. Overlapping sessions in a channel mean those people were in the call together. Nothing before 2026-11",
  }),
});
const Reaction = Schema.Struct({
  messageId: Schema.String,
  channelId: Schema.String,
  userId: Schema.String,
  messageAuthorId: Schema.NullOr(Schema.String),
  emoji: Schema.String.annotate({ description: "Unicode, or name:id for a custom emoji" }),
  burst: Schema.Boolean.annotate({ description: "A super reaction" }),
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
export const ListReactionsOutput = Schema.Struct({
  ingest: Consent,
  reactionTotal: Schema.Int,
  reactions: Schema.Array(Reaction),
  voteTotal: Schema.Int,
  votes: Schema.Array(Vote),
  live: Schema.NullOr(LiveMessage).annotate({
    description:
      "Discord's current view of message: up to 100 people per emoji or answer and 20 emoji",
  }),
});
const LinkedAccount = Schema.Struct({
  type: Schema.String,
  name: Schema.String,
  verified: Schema.Boolean.annotate({ description: "Discord checked they own it" }),
  publishedAt: Schema.String,
});
const LinkedPerson = Schema.Struct({
  userId: Schema.String,
  accounts: Schema.Array(LinkedAccount),
});
export const ListLinkedAccountsOutput = Schema.Struct({
  ingest: Consent,
  people: Schema.Array(LinkedPerson).annotate({
    description: "Current members who published accounts in the dashboard",
  }),
});
export const ReadMessagesOutput = Schema.Struct({
  ingest: Schema.optionalKey(Ingest),
  notFullyIngested: Schema.optionalKey(Schema.Array(PendingChannel)),
  messages: Schema.Array(Message),
});
