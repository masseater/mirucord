import type {
  GatewayJob,
  ThreadMemberChange,
  ThreadMembersJob,
} from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Array, DateTime, Match, Option, pipe, Schema } from "effect";

import { mergeByGuild } from "./guild-batch";

const AddedMember = Schema.Struct({
  user_id: Schema.String,
  join_timestamp: Schema.DateTimeUtcFromString,
});

const ThreadMembersUpdate = Schema.Struct({
  id: Schema.String,
  guild_id: Schema.String,
  added_members: Schema.optional(Schema.Array(AddedMember)),
  removed_member_ids: Schema.optional(Schema.Array(Schema.String)),
});

const decodeUpdate = Schema.decodeUnknownOption(ThreadMembersUpdate);

const changesOf =
  (now: number) =>
  (update: typeof ThreadMembersUpdate.Type): readonly ThreadMemberChange[] => [
    ...pipe(
      update.added_members ?? [],
      Array.map(({ user_id, join_timestamp }): ThreadMemberChange => ({
        kind: "join",
        threadId: update.id,
        userId: user_id,
        at: DateTime.toEpochMillis(join_timestamp),
      })),
    ),
    ...pipe(
      update.removed_member_ids ?? [],
      Array.map((userId): ThreadMemberChange => ({
        kind: "leave",
        threadId: update.id,
        userId,
        at: now,
      })),
    ),
  ];

const updateJob =
  (data: unknown) =>
  (now: number): Option.Option<GatewayJob> =>
    Option.flatMap(decodeUpdate(data), (update) =>
      Option.map(
        Array.match(changesOf(now)(update), { onEmpty: Option.none, onNonEmpty: Option.some }),
        (changes): GatewayJob => ({ kind: "threadMembers", guildId: update.guild_id, changes }),
      ),
    );

const threadMemberJobOf = Match.type<Discord.GatewayDispatchPayload>().pipe(
  Match.discriminator("t")(Discord.GatewayDispatchEvents.ThreadMembersUpdate, (dispatch) =>
    updateJob(dispatch.d),
  ),
  Match.orElse(() => (): Option.Option<GatewayJob> => Option.none()),
);

const threadMemberJobKeyOf = (job: ThreadMembersJob): string => {
  const { threadId, at } = Array.headNonEmpty(job.changes);
  return `${job.guildId}-${threadId}-${at}`;
};

const isThreadMembersJob = (job: GatewayJob): job is ThreadMembersJob =>
  job.kind === "threadMembers";

const mergeThreadMemberJobs = mergeByGuild({
  isBatch: isThreadMembersJob,
  rebuild: (guildId, changes): GatewayJob => ({ kind: "threadMembers", guildId, changes }),
});

export { mergeThreadMemberJobs, threadMemberJobKeyOf, threadMemberJobOf };
