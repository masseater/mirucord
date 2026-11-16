import type { GatewayJob } from "./gateway-job-schema";

export type GuildJob = Extract<GatewayJob, Readonly<{ kind: "join" | "sync" | "leave" }>>;

export type MemberJob = Extract<GatewayJob, Readonly<{ kind: "members" | "depart" }>>;

const GUILD_WIDE_KINDS = [
  "members",
  "depart",
  "voice",
  "voiceSnapshot",
  "reactions",
] as const satisfies readonly GatewayJob["kind"][];

export type GuildWideJob = Extract<
  GatewayJob,
  Readonly<{ kind: (typeof GUILD_WIDE_KINDS)[number] }>
>;

export const isGuildJob = (job: GatewayJob): job is GuildJob =>
  job.kind === "join" || job.kind === "sync" || job.kind === "leave";

export const isMemberJob = (job: GatewayJob): job is MemberJob =>
  job.kind === "members" || job.kind === "depart";

export type VoiceJobs = Extract<GatewayJob, Readonly<{ kind: "voice" | "voiceSnapshot" }>>;

export const isVoiceJob = (job: GatewayJob): job is VoiceJobs =>
  job.kind === "voice" || job.kind === "voiceSnapshot";

const GUILD_WIDE: ReadonlySet<GatewayJob["kind"]> = new Set(GUILD_WIDE_KINDS);

export const isGuildWideJob = (job: GatewayJob): job is GuildWideJob => GUILD_WIDE.has(job.kind);

export const subjectOf = (job: GatewayJob): Readonly<Record<string, string>> => {
  if (job.kind === "resync") {
    return { kind: job.kind };
  }
  if (isGuildJob(job) || isGuildWideJob(job)) {
    return { kind: job.kind, guildId: job.guildId };
  }
  return { kind: job.kind, channelId: job.channelId };
};
