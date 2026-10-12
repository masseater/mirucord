import { guildMessage } from "#/entities/guild-message/model/guild-message.schema";

const BOUND_LIMIT = 90;

const TRACKED_COLUMNS = {
  id: guildMessage.id,
  createdAt: guildMessage.createdAt,
  version: guildMessage.version,
};

type StoredRow = Readonly<{
  id: string;
  channelId: string;
  authorId: string;
  sealed: string;
  createdAt: number;
  editedAt: number | null;
  describedWith: string | null;
}>;

type TrackedRow = Readonly<{ id: string; createdAt: number; version: number }>;

type IndexedMessage = Readonly<{ row: StoredRow; tokens: readonly number[] }>;

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

export { BOUND_LIMIT, TRACKED_COLUMNS };
export type {
  ChannelCount,
  CreatedRange,
  IndexedMessage,
  ReadPage,
  SealedMessage,
  StoredRow,
  StoredState,
  TrackedRow,
  WriteMode,
};
