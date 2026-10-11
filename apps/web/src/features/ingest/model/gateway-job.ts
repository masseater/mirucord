import { GatewayDispatchEvents } from "discord-api-types/v10";
import { Array, Option, Schema } from "effect";

import type { GatewayJob, MessageJob } from "./ingest-job";

type GatewayEvent = Readonly<{ event: string | null; data: unknown }>;

type JobKind = MessageJob["kind"];

const MessageEvent = Schema.Struct({
  id: Schema.String,
  channel_id: Schema.String,
  guild_id: Schema.optional(Schema.String),
});

const BulkDeleteEvent = Schema.Struct({
  ids: Schema.NonEmptyArray(Schema.String),
  channel_id: Schema.String,
  guild_id: Schema.optional(Schema.String),
});

const GuildEvent = Schema.Struct({ id: Schema.String });

const decodeGuild = Schema.decodeUnknownOption(GuildEvent);
const decodeMessage = Schema.decodeUnknownOption(MessageEvent);
const decodeBulkDelete = Schema.decodeUnknownOption(BulkDeleteEvent);

const KIND_OF_EVENT: ReadonlyMap<string, JobKind> = new Map([
  [GatewayDispatchEvents.MessageCreate, "refresh"],
  [GatewayDispatchEvents.MessageUpdate, "refresh"],
  [GatewayDispatchEvents.MessageDelete, "forget"],
]);

type Target = Readonly<{
  channel_id: string;
  guild_id?: string | undefined;
  messageIds: readonly [string, ...string[]];
}>;

const jobFor = (kind: JobKind, target: Target): Option.Option<GatewayJob> =>
  Option.fromUndefinedOr(target.guild_id).pipe(
    Option.map((guildId) => ({
      kind,
      guildId,
      channelId: target.channel_id,
      messageIds: target.messageIds,
    })),
  );

const singleJob = (kind: JobKind, data: unknown): Option.Option<GatewayJob> =>
  decodeMessage(data).pipe(
    Option.flatMap((event) => jobFor(kind, { ...event, messageIds: [event.id] })),
  );

const bulkJob = (data: unknown): Option.Option<GatewayJob> =>
  decodeBulkDelete(data).pipe(
    Option.flatMap((event) => jobFor("forget", { ...event, messageIds: event.ids })),
  );

const joinJob = (data: unknown): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => ({ kind: "join", guildId: id })));

const toGatewayJob = ({ event, data }: GatewayEvent): Option.Option<GatewayJob> => {
  if (event === GatewayDispatchEvents.MessageDeleteBulk) {
    return bulkJob(data);
  }
  if (event === GatewayDispatchEvents.GuildCreate) {
    return joinJob(data);
  }
  return Option.fromNullOr(event).pipe(
    Option.flatMap((name) => Option.fromUndefinedOr(KIND_OF_EVENT.get(name))),
    Option.flatMap((kind) => singleJob(kind, data)),
  );
};

const subjectOf = (job: GatewayJob): Readonly<Record<string, string>> => {
  if (job.kind === "join") {
    return { kind: job.kind, guildId: job.guildId };
  }
  return { kind: job.kind, channelId: job.channelId };
};

const jobKeyOf = (job: GatewayJob): string => {
  if (job.kind === "join") {
    return job.guildId;
  }
  return Array.headNonEmpty(job.messageIds);
};

export { jobKeyOf, subjectOf, toGatewayJob };
export type { GatewayEvent };
