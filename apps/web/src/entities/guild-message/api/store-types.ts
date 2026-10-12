import type { PhraseHash } from "#/entities/guild-message/lib/phrases.server";

type StoredRow = Readonly<{
  id: string;
  channelId: string;
  authorId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
  describedWith: string | null;
}>;

type PhraseState =
  | Readonly<{ status: "pending" }>
  | Readonly<{ status: "extracted"; hashes: readonly PhraseHash[] }>;

type ExtractedHashes = Extract<PhraseState, Readonly<{ status: "extracted" }>>["hashes"];

type PhraseColumn = "messageId" | "authorId" | "channelId";

type IndexedMessage = Readonly<{
  row: StoredRow;
  tokens: readonly number[];
  phrases: PhraseState;
}>;

type TrackedRow = Readonly<{ id: string; createdAt: number; version: number }>;

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

type PhraseChannel = Readonly<{ channelId: string; uses: number }>;

type PhraseCandidate = Readonly<{
  phrase: string;
  common: string;
  uses: number;
  people: number;
  lastUsedAt: number;
  channels: readonly PhraseChannel[];
}>;

type PhraseTally = Readonly<{
  written: number;
  generation: number;
  candidates: readonly PhraseCandidate[];
  presence: readonly string[];
}>;

type PhraseStatsLookup =
  | Readonly<{ status: "fresh"; body: string }>
  | Readonly<{ status: "stale" }>;

type PhraseRequest = Readonly<{ guildId: string; visibility: string; now: number }>;

type SavedStats = Readonly<{
  body: string;
  written: number;
  generation: number;
  computedAt: number;
}>;

type PhraseExample = Readonly<{ phrase: string; messageIds: readonly string[] }>;

type PhraseContext = Readonly<{ messageId: string; messages: readonly SealedMessage[] }>;

type UnphrasedMessage = SealedMessage & Readonly<{ authorId: string }>;

type ExtractedPhrases = Readonly<{ message: UnphrasedMessage; hashes: readonly PhraseHash[] }>;

export type {
  ChannelCount,
  CreatedRange,
  ExtractedHashes,
  ExtractedPhrases,
  IndexedMessage,
  PhraseCandidate,
  PhraseChannel,
  PhraseColumn,
  PhraseContext,
  PhraseExample,
  PhraseRequest,
  PhraseState,
  PhraseStatsLookup,
  PhraseTally,
  ReadPage,
  SavedStats,
  SealedMessage,
  StoredRow,
  StoredState,
  TrackedRow,
  UnphrasedMessage,
  WriteMode,
};
