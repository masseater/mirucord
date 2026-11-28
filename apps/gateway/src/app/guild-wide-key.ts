import { isMemberJob, isVoiceJob } from "@repo/ingest-util-gateway-contract";
import type { GuildWideJob } from "@repo/ingest-util-gateway-contract";

import { memberJobKeyOf } from "./member-job.ts";
import { reactionJobKeyOf } from "./reaction-job.ts";
import { voiceJobKeyOf } from "./voice-job.ts";

export const guildWideKeyOf = (job: GuildWideJob): string => {
  if (isMemberJob(job)) {
    return memberJobKeyOf(job);
  }
  if (isVoiceJob(job)) {
    return voiceJobKeyOf(job);
  }
  return reactionJobKeyOf(job);
};
