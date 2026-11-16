import type { PRECISIONS } from "#/entities/guild-message/model/voice-session.schema";

export type VoicePrecision = (typeof PRECISIONS)[number];

export type VoiceMoment = Readonly<{ at: number; precision: VoicePrecision }>;

export type StoredVoiceSession = Readonly<{
  userId: string;
  channelId: string;
  joined: VoiceMoment;
  left: VoiceMoment | null;
}>;

export type VoiceChangeWrite = Readonly<{ userId: string; channelId: string | null; at: number }>;

export type VoiceSnapshotWrite = Readonly<{
  at: number;
  present: readonly Readonly<{ userId: string; channelId: string }>[];
}>;

export type VoiceLookup = Readonly<{
  channelIds: readonly string[];
  userIds: readonly string[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

export type VoicePage = Readonly<{ total: number; sessions: readonly StoredVoiceSession[] }>;
