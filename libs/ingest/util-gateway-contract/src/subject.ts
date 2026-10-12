import type { GatewayJob } from "./gateway-job-schema";

type GuildJob = Extract<GatewayJob, Readonly<{ kind: "join" | "sync" | "leave" }>>;

const isGuildJob = (job: GatewayJob): job is GuildJob =>
  job.kind === "join" || job.kind === "sync" || job.kind === "leave";

const subjectOf = (job: GatewayJob): Readonly<Record<string, string>> => {
  if (job.kind === "resync") {
    return { kind: job.kind };
  }
  if (isGuildJob(job)) {
    return { kind: job.kind, guildId: job.guildId };
  }
  return { kind: job.kind, channelId: job.channelId };
};

export { isGuildJob, subjectOf };
export type { GuildJob };
