type VoicePrecision = "exact" | "noLaterThan";

type VoiceMoment = Readonly<{ at: number; precision: VoicePrecision }>;

type StoredVoiceSession = Readonly<{
  userId: string;
  channelId: string;
  joined: VoiceMoment;
  left: VoiceMoment | null;
}>;

type VoiceChangeWrite = Readonly<{ userId: string; channelId: string | null; at: number }>;

type VoiceSnapshotWrite = Readonly<{
  at: number;
  present: readonly Readonly<{ userId: string; channelId: string }>[];
}>;

type VoiceLookup = Readonly<{
  channelIds: readonly string[];
  userIds: readonly string[] | null;
  since: number | null;
  until: number | null;
  limit: number;
  offset: number;
}>;

type VoicePage = Readonly<{ total: number; sessions: readonly StoredVoiceSession[] }>;

export type {
  StoredVoiceSession,
  VoiceMoment,
  VoiceChangeWrite,
  VoiceLookup,
  VoicePage,
  VoiceSnapshotWrite,
};
