import { isMemberJob } from "@repo/ingest-util-gateway-contract";
import type { GatewayJob, MemberJob } from "@repo/ingest-util-gateway-contract";
import { DiscordMemberSchema } from "@repo/shared-util-discord";
import type { DiscordMember } from "@repo/shared-util-discord";
import { Array, Option, pipe, Record, Schema } from "effect";

const MEMBERS_PER_JOB = 100;

const MemberEvent = Schema.Struct({ ...DiscordMemberSchema.fields, guild_id: Schema.String });

const DepartEvent = Schema.Struct({
  guild_id: Schema.String,
  user: Schema.Struct({ id: Schema.String }),
});

const decodeMember = Schema.decodeOption(MemberEvent);
const decodeDepart = Schema.decodeOption(DepartEvent);

const membersJob = (data: typeof MemberEvent.Encoded): Option.Option<GatewayJob> =>
  decodeMember(data).pipe(
    Option.map(({ guild_id, ...member }) => ({
      kind: "members",
      guildId: guild_id,
      members: [member],
    })),
  );

const departJob = (data: typeof DepartEvent.Encoded): Option.Option<GatewayJob> =>
  decodeDepart(data).pipe(
    Option.map(({ guild_id, user }) => ({ kind: "depart", guildId: guild_id, userIds: [user.id] })),
  );

const memberJobKeyOf = (job: MemberJob): string => {
  if (job.kind === "members") {
    return `${job.guildId}-${Array.headNonEmpty(job.members).user.id}`;
  }
  return `${job.guildId}-${Array.headNonEmpty(job.userIds)}`;
};

type MemberChange = Readonly<{
  guildId: string;
  userId: string;
  member: Option.Option<DiscordMember>;
}>;

const memberChangesOf = (job: MemberJob): readonly MemberChange[] => {
  if (job.kind === "members") {
    return pipe(
      job.members,
      Array.map((member) => ({
        guildId: job.guildId,
        userId: member.user.id,
        member: Option.some(member),
      })),
    );
  }
  return pipe(
    job.userIds,
    Array.map((userId) => ({ guildId: job.guildId, userId, member: Option.none() })),
  );
};

const jobsOfGuild = (changes: Array.NonEmptyReadonlyArray<MemberChange>): readonly GatewayJob[] => {
  const { guildId } = Array.headNonEmpty(changes);
  const members = pipe(
    changes,
    Array.flatMap(({ member }) => Option.toArray(member)),
  );
  const departed = pipe(
    changes,
    Array.filter(({ member }) => Option.isNone(member)),
    Array.map(({ userId }) => userId),
  );
  return [
    ...pipe(
      Array.chunksOf(members, MEMBERS_PER_JOB),
      Array.map((chunk): GatewayJob => ({ kind: "members", guildId, members: chunk })),
    ),
    ...pipe(
      Array.chunksOf(departed, MEMBERS_PER_JOB),
      Array.map((chunk): GatewayJob => ({ kind: "depart", guildId, userIds: chunk })),
    ),
  ];
};

const mergeMemberJobs = (jobs: readonly GatewayJob[]): readonly GatewayJob[] => {
  const latest = new Map(
    pipe(
      jobs,
      Array.filter(isMemberJob),
      Array.flatMap(memberChangesOf),
      Array.map((change) => [`${change.guildId}/${change.userId}`, change] as const),
    ),
  );
  const byGuild = Array.groupBy([...latest.values()], ({ guildId }) => guildId);
  return pipe(Record.values(byGuild), Array.flatMap(jobsOfGuild));
};

export { departJob, memberJobKeyOf, membersJob, mergeMemberJobs };
