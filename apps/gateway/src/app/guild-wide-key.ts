import { isMemberJob, isVoiceJob } from "@repo/ingest-util-gateway-contract";
import type { GuildWideJob } from "@repo/ingest-util-gateway-contract";

import { memberJobKeyOf } from "./member-job";
import { reactionJobKeyOf } from "./reaction-job";
import { scheduledEventJobKeyOf } from "./scheduled-event-job";
import { threadMemberJobKeyOf } from "./thread-member-job";
import { voiceJobKeyOf } from "./voice-job";

const guildWideKeyOf = (job: GuildWideJob): string => {
  if (isMemberJob(job)) {
    return memberJobKeyOf(job);
  }
  if (isVoiceJob(job)) {
    return voiceJobKeyOf(job);
  }
  if (job.kind === "scheduledEvents") {
    return scheduledEventJobKeyOf(job);
  }
  if (job.kind === "threadMembers") {
    return threadMemberJobKeyOf(job);
  }
  return reactionJobKeyOf(job);
};

export { guildWideKeyOf };
