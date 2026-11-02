import type { GatewayJob } from "@repo/ingest-util-gateway-contract";

import { mergeReactionJobs, reactionJobOf } from "./reaction-job";
import { mergeVoiceJobs, voiceJobOf } from "./voice-job";

const ACTIVITY_JOBS = [voiceJobOf, reactionJobOf];

const mergeActivityJobs = (jobs: readonly GatewayJob[]): readonly GatewayJob[] => [
  ...mergeVoiceJobs(jobs),
  ...mergeReactionJobs(jobs),
];

export { ACTIVITY_JOBS, mergeActivityJobs };
