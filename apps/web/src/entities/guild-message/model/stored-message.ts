type StoredRow = Readonly<{
  id: string;
  channelId: string;
  authorId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
  describedWith: string | null;
}>;

type IndexedMessage = Readonly<{ row: StoredRow; tokens: readonly string[] }>;

type WriteMode = "overwrite" | "adopt";

type StoredState = Readonly<{ id: string; editedAt: number | null; describedWith: string | null }>;

type SealedMessage = Readonly<{
  id: string;
  channelId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
}>;

type ChannelCount = Readonly<{ channelId: string; messages: number }>;

type CreatedRange = Readonly<{ from: number | null; upTo: number | null }>;

type ReadPage = Readonly<{ before: string | null; limit: number }>;

type SearchPage = Readonly<{ before: number | null; limit: number }>;

type CandidateMessage = SealedMessage & Readonly<{ seq: number }>;

type Candidates = Readonly<{ messages: readonly CandidateMessage[]; next: number | null }>;

type Seq = Readonly<{ seq: number }>;

export type {
  CandidateMessage,
  Candidates,
  ChannelCount,
  CreatedRange,
  IndexedMessage,
  ReadPage,
  SealedMessage,
  SearchPage,
  Seq,
  StoredRow,
  StoredState,
  WriteMode,
};
