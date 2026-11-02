import { isVoiceJob } from "@repo/ingest-util-gateway-contract";
import type {
  GatewayJob,
  VoiceChange,
  VoiceJob,
  VoiceSnapshotJob,
} from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Array, Match, Option, pipe, Record, Schema } from "effect";

const CHANGES_PER_JOB = 100;

const VoiceState = Schema.Struct({
  user_id: Schema.String,
  channel_id: Schema.NullOr(Schema.String),
});

const VoiceStateEvent = Schema.Struct({
  ...VoiceState.fields,
  guild_id: Schema.NullOr(Schema.String),
});

const GuildCreateEvent = Schema.Struct({
  id: Schema.String,
  voice_states: Schema.optional(Schema.Array(VoiceState)),
});

const decodeVoiceState = Schema.decodeOption(VoiceStateEvent);
const decodeGuildCreate = Schema.decodeOption(GuildCreateEvent);

const changeJobOf = (
  data: typeof VoiceStateEvent.Encoded,
  now: number,
): Option.Option<GatewayJob> =>
  decodeVoiceState(data).pipe(
    Option.flatMap(({ guild_id, user_id, channel_id }) =>
      Option.fromNullOr(guild_id).pipe(
        Option.map((guildId): GatewayJob => ({
          kind: "voice",
          guildId,
          changes: [{ userId: user_id, channelId: channel_id, at: now }],
        })),
      ),
    ),
  );

const snapshotJobOf = (
  data: typeof GuildCreateEvent.Encoded,
  now: number,
): Option.Option<GatewayJob> =>
  decodeGuildCreate(data).pipe(
    Option.map(({ id, voice_states }): GatewayJob => ({
      kind: "voiceSnapshot",
      guildId: id,
      at: now,
      present: pipe(
        Option.getOrElse(Option.fromUndefinedOr(voice_states), () => []),
        Array.flatMap(({ user_id, channel_id }) =>
          Option.toArray(
            Option.fromNullOr(channel_id).pipe(
              Option.map((channelId) => ({ userId: user_id, channelId })),
            ),
          ),
        ),
      ),
    })),
  );

const voiceJobOf = Match.type<Discord.GatewayDispatchPayload>().pipe(
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.VoiceStateUpdate,
    (dispatch) =>
      (now: number): Option.Option<GatewayJob> =>
        changeJobOf(dispatch.d, now),
  ),
  Match.discriminator("t")(
    Discord.GatewayDispatchEvents.GuildCreate,
    (dispatch) =>
      (now: number): Option.Option<GatewayJob> =>
        snapshotJobOf(dispatch.d, now),
  ),
  Match.orElse(() => (): Option.Option<GatewayJob> => Option.none()),
);

const voiceJobKeyOf = (job: VoiceJob | VoiceSnapshotJob): string => {
  if (job.kind === "voiceSnapshot") {
    return `${job.guildId}-${job.at}`;
  }
  const { userId, at } = Array.headNonEmpty(job.changes);
  return `${job.guildId}-${userId}-${at}`;
};

type GuildVoice = Readonly<{
  snapshot: Option.Option<VoiceSnapshotJob>;
  changes: readonly VoiceChange[];
}>;

const jobsOfGuild = (guildId: string, { snapshot, changes }: GuildVoice): readonly GatewayJob[] => {
  const since = snapshot.pipe(
    Option.map(({ at }) => at),
    Option.getOrElse(() => Number.NEGATIVE_INFINITY),
  );
  const after = pipe(
    changes,
    Array.filter(({ at }) => at >= since),
  );
  return [
    ...Option.toArray(snapshot),
    ...pipe(
      Array.chunksOf(after, CHANGES_PER_JOB),
      Array.map((chunk): GatewayJob => ({ kind: "voice", guildId, changes: chunk })),
    ),
  ];
};

const guildVoiceOf = (jobs: readonly (VoiceJob | VoiceSnapshotJob)[]): GuildVoice => ({
  snapshot: pipe(
    jobs,
    Array.filter((job): job is VoiceSnapshotJob => job.kind === "voiceSnapshot"),
    Array.last,
  ),
  changes: pipe(
    jobs,
    Array.flatMap((job) => {
      if (job.kind === "voice") {
        return job.changes;
      }
      return [];
    }),
  ),
});

const mergeVoiceJobs = (jobs: readonly GatewayJob[]): readonly GatewayJob[] => {
  const byGuild = Array.groupBy(pipe(jobs, Array.filter(isVoiceJob)), ({ guildId }) => guildId);
  return pipe(
    Record.toEntries(byGuild),
    Array.flatMap(([guildId, guildJobs]) => jobsOfGuild(guildId, guildVoiceOf(guildJobs))),
  );
};

export { mergeVoiceJobs, voiceJobKeyOf, voiceJobOf };
