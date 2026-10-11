import { GatewayDispatchEvents } from "discord-api-types/v10";
import { Option, Schema } from "effect";

import type { GatewayJob } from "#/features/ingest/model/ingest-job";

type GatewayEvent = Readonly<{ event: string | null; data: unknown }>;

type JobKind = GatewayJob["kind"];

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

const toGatewayJob = ({ event, data }: GatewayEvent): Option.Option<GatewayJob> => {
  if (event === GatewayDispatchEvents.MessageDeleteBulk) {
    return bulkJob(data);
  }
  return Option.fromNullOr(event).pipe(
    Option.flatMap((name) => Option.fromUndefinedOr(KIND_OF_EVENT.get(name))),
    Option.flatMap((kind) => singleJob(kind, data)),
  );
};

export { toGatewayJob };
export type { GatewayEvent };
