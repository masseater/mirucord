import type { GatewayJob } from "./gateway-job-schema";

type GuildJob = Extract<GatewayJob, Readonly<{ kind: "join" | "sync" | "leave" }>>;

type MemberJob = Extract<GatewayJob, Readonly<{ kind: "members" | "depart" }>>;

const GUILD_WIDE_KINDS = [
  "members",
  "depart",
  "voice",
  "voiceSnapshot",
  "reactions",
] as const satisfies readonly GatewayJob["kind"][];

type GuildWideJob = Extract<GatewayJob, Readonly<{ kind: (typeof GUILD_WIDE_KINDS)[number] }>>;

const isGuildJob = (job: GatewayJob): job is GuildJob =>
  job.kind === "join" || job.kind === "sync" || job.kind === "leave";

const isMemberJob = (job: GatewayJob): job is MemberJob =>
  job.kind === "members" || job.kind === "depart";

type VoiceJobs = Extract<GatewayJob, Readonly<{ kind: "voice" | "voiceSnapshot" }>>;

const isVoiceJob = (job: GatewayJob): job is VoiceJobs =>
  job.kind === "voice" || job.kind === "voiceSnapshot";

const GUILD_WIDE: ReadonlySet<GatewayJob["kind"]> = new Set(GUILD_WIDE_KINDS);

const isGuildWideJob = (job: GatewayJob): job is GuildWideJob => GUILD_WIDE.has(job.kind);

const subjectOf = (job: GatewayJob): Readonly<Record<string, string>> => {
  if (job.kind === "resync") {
    return { kind: job.kind };
  }
  if (isGuildJob(job) || isGuildWideJob(job)) {
    return { kind: job.kind, guildId: job.guildId };
  }
  return { kind: job.kind, channelId: job.channelId };
};

export { isGuildJob, isGuildWideJob, isMemberJob, isVoiceJob, subjectOf };
export type { GuildJob, GuildWideJob, MemberJob, VoiceJobs };
