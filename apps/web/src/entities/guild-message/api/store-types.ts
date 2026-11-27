import type { PhraseHash } from "#/entities/guild-message/lib/phrases.server";

export type StoredRow = Readonly<{
  id: string;
  channelId: string;
  authorId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
  describedWith: string | null;
}>;

export type PhraseState =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "extracted"; hashes: readonly PhraseHash[] }>;

export type PhraseColumn = "messageId" | "authorId" | "channelId";

export type NoteStatus = "pending" | "common" | "server";

export type PhraseNote = Readonly<{
  phrase: string;
  status: Exclude<NoteStatus, "pending">;
  sealed: string | null;
  examples: readonly string[];
}>;

export type NoteClaim = Readonly<{ phrases: readonly string[]; now: number }>;

export type IndexedMessage = Readonly<{
  row: StoredRow;
  tokens: readonly number[];
  phrases: PhraseState;
}>;

export type TrackedRow = Readonly<{ id: string; createdAt: number; version: number }>;

export type WriteMode = "overwrite" | "adopt";

export type StoredState = Readonly<{
  id: string;
  editedAt: number | null;
  describedWith: string | null;
}>;

export type SealedMessage = Readonly<{
  id: string;
  channelId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
}>;

export type ChannelCount = Readonly<{ channelId: string; messages: number }>;

export type ChannelOldest = Readonly<{ channelId: string; oldest: number }>;

export type AuthoredMessage = Readonly<{ id: string; authorId: string }>;

export type AuthorPage = Readonly<{
  authorId: string;
  channelIds: readonly string[];
  before: string | null;
  limit: number;
}>;

export type CreatedRange = Readonly<{ from: number | null; upTo: number | null }>;

export type ReadPage = Readonly<{ before: string | null; limit: number }>;

export type PhraseChannel = Readonly<{ channelId: string; uses: number }>;

export type PhraseCandidate = Readonly<{
  phrase: string;
  common: string;
  uses: number;
  people: number;
  lastUsedAt: number;
  channels: readonly PhraseChannel[];
}>;

export type PhraseTally = Readonly<{
  written: number;
  generation: number;
  candidates: readonly PhraseCandidate[];
  presence: readonly string[];
}>;

export type PhraseStatsLookup =
  | Readonly<{ status: "fresh"; body: string }>
  | Readonly<{ status: "stale" }>;

export type PhraseRequest = Readonly<{ guildId: string; visibility: string; now: number }>;

export type SavedStats = Readonly<{
  body: string;
  written: number;
  generation: number;
  computedAt: number;
}>;

export type PhraseExample = Readonly<{ phrase: string; messageIds: readonly string[] }>;

export type PhraseContext = Readonly<{ messageId: string; messages: readonly SealedMessage[] }>;

export type NoteSample = Readonly<{
  before: readonly SealedMessage[];
  use: SealedMessage;
  after: readonly SealedMessage[];
}>;

export type PhraseSamples = Readonly<{ phrase: string; samples: readonly NoteSample[] }>;

export type SampleRequest = Readonly<{ phrases: readonly string[]; channelIds: readonly string[] }>;

export type UnphrasedMessage = SealedMessage & Readonly<{ authorId: string }>;

export type ExtractedPhrases = Readonly<{
  message: UnphrasedMessage;
  hashes: readonly PhraseHash[];
}>;
