export type StoredReaction = Readonly<{
  messageId: string;
  channelId: string;
  userId: string;
  messageAuthorId: string | null;
  emoji: string;
  burst: boolean;
  reactedAt: number;
}>;

export type StoredVote = Readonly<{
  messageId: string;
  channelId: string;
  userId: string;
  answerId: number;
  votedAt: number;
}>;

export type ReactionLookup = Readonly<{
  channelIds: readonly string[];
  messageId: string | null;
  userIds: readonly string[] | null;
  authorIds: readonly string[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

export type ReactionPage = Readonly<{
  reactionTotal: number;
  reactions: readonly StoredReaction[];
  voteTotal: number;
  votes: readonly StoredVote[];
}>;
