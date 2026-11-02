import type { GatewayJob } from "./gateway-job-schema";

type GuildJob = Extract<GatewayJob, Readonly<{ kind: "join" | "sync" | "leave" }>>;

type MemberJob = Extract<GatewayJob, Readonly<{ kind: "members" | "depart" }>>;

const isGuildJob = (job: GatewayJob): job is GuildJob =>
  job.kind === "join" || job.kind === "sync" || job.kind === "leave";

const isMemberJob = (job: GatewayJob): job is MemberJob =>
  job.kind === "members" || job.kind === "depart";

const subjectOf = (job: GatewayJob): Readonly<Record<string, string>> => {
  if (job.kind === "resync") {
    return { kind: job.kind };
  }
  if (isGuildJob(job) || isMemberJob(job)) {
    return { kind: job.kind, guildId: job.guildId };
  }
  return { kind: job.kind, channelId: job.channelId };
};

export { isGuildJob, isMemberJob, subjectOf };
export type { GuildJob, MemberJob };
