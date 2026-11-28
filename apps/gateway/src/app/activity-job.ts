import type { GatewayJob } from "@repo/ingest-util-gateway-contract";

import { mergeReactionJobs, reactionJobOf } from "./reaction-job.ts";
import { mergeVoiceJobs, voiceJobOf } from "./voice-job.ts";

export const ACTIVITY_JOBS = [voiceJobOf, reactionJobOf];

export const mergeActivityJobs = (jobs: readonly GatewayJob[]): readonly GatewayJob[] => [
  ...mergeVoiceJobs(jobs),
  ...mergeReactionJobs(jobs),
];
