import type { GatewayJob } from "@repo/ingest-util-gateway-contract";

import { mergeReactionJobs, reactionJobOf } from "./reaction-job";
import { mergeScheduledEventJobs, scheduledEventJobOf } from "./scheduled-event-job";
import { mergeThreadMemberJobs, threadMemberJobOf } from "./thread-member-job";
import { mergeVoiceJobs, voiceJobOf } from "./voice-job";

const ACTIVITY_JOBS = [voiceJobOf, reactionJobOf, scheduledEventJobOf, threadMemberJobOf];

const mergeActivityJobs = (jobs: readonly GatewayJob[]): readonly GatewayJob[] => [
  ...mergeVoiceJobs(jobs),
  ...mergeReactionJobs(jobs),
  ...mergeScheduledEventJobs(jobs),
  ...mergeThreadMemberJobs(jobs),
];

export { ACTIVITY_JOBS, mergeActivityJobs };
