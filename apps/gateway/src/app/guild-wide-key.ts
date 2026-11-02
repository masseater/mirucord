import type { GuildWideJob } from "@repo/ingest-util-gateway-contract";
import { Match } from "effect";

import { auditLogJobKeyOf } from "./audit-log-job";
import { memberJobKeyOf } from "./member-job";
import { reactionJobKeyOf } from "./reaction-job";
import { scheduledEventJobKeyOf } from "./scheduled-event-job";
import { threadMemberJobKeyOf } from "./thread-member-job";
import { voiceJobKeyOf } from "./voice-job";

const guildWideKeyOf: (job: GuildWideJob) => string = Match.type<GuildWideJob>().pipe(
  Match.discriminatorsExhaustive("kind")({
    members: memberJobKeyOf,
    depart: memberJobKeyOf,
    voice: voiceJobKeyOf,
    voiceSnapshot: voiceJobKeyOf,
    reactions: reactionJobKeyOf,
    scheduledEvents: scheduledEventJobKeyOf,
    threadMembers: threadMemberJobKeyOf,
    auditLog: auditLogJobKeyOf,
  }),
);

export { guildWideKeyOf };
