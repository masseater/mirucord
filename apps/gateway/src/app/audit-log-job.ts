import type { AuditLogEntry, AuditLogJob, GatewayJob } from "@repo/ingest-util-gateway-contract";
import { DiscordSnowflake } from "@sapphire/snowflake";
import { Discord } from "dfx";
import { Match, Option, pipe, Schema, Struct } from "effect";

import { mergeByGuild } from "./guild-batch";

const Detail = Schema.Struct({
  reason: Schema.NullOr(Schema.String),
  changes: Schema.optional(Schema.Unknown),
  options: Schema.optional(Schema.Unknown),
});

const encodeDetail = Schema.encodeOption(Schema.fromJsonString(Detail));

const AuditLogEntryCreate = Schema.Struct({
  id: Schema.String,
  guild_id: Schema.String,
  action_type: Schema.Int,
  user_id: Schema.optional(Schema.NullOr(Schema.String)),
  target_id: Schema.optional(Schema.NullOr(Schema.String)),
  reason: Schema.optional(Schema.NullOr(Schema.String)),
  changes: Schema.optional(Schema.Unknown),
  options: Schema.optional(Schema.Unknown),
});

const decodeEntry = Schema.decodeUnknownOption(AuditLogEntryCreate);

const nullOf = (value: string | null | undefined): string | null =>
  Option.getOrNull(Option.fromNullishOr(value));

const entryOf = (raw: typeof AuditLogEntryCreate.Type): Option.Option<AuditLogEntry> => {
  const detail = encodeDetail({
    ...Struct.pick(raw, ["changes", "options"]),
    reason: nullOf(raw.reason),
  });
  return pipe(
    detail,
    Option.map((encoded) => ({
      entryId: raw.id,
      actionType: raw.action_type,
      userId: nullOf(raw.user_id),
      targetId: nullOf(raw.target_id),
      at: DiscordSnowflake.timestampFrom(raw.id),
      detail: encoded,
    })),
  );
};

const createJob = (data: unknown) => (): Option.Option<GatewayJob> =>
  Option.flatMap(decodeEntry(data), (raw) =>
    Option.map(entryOf(raw), (entry): GatewayJob => ({
      kind: "auditLog",
      guildId: raw.guild_id,
      changes: [entry],
    })),
  );

const auditLogJobOf = Match.type<Discord.GatewayDispatchPayload>().pipe(
  Match.discriminator("t")(Discord.GatewayDispatchEvents.GuildAuditLogEntryCreate, (dispatch) =>
    createJob(dispatch.d),
  ),
  Match.orElse(() => (): Option.Option<GatewayJob> => Option.none()),
);

const auditLogJobKeyOf = (job: AuditLogJob): string => {
  const [{ entryId }] = job.changes;
  return `${job.guildId}-audit-${entryId}`;
};

const isAuditLogJob = (job: GatewayJob): job is AuditLogJob => job.kind === "auditLog";

const mergeAuditLogJobs = mergeByGuild({
  isBatch: isAuditLogJob,
  rebuild: (guildId, changes): GatewayJob => ({ kind: "auditLog", guildId, changes }),
});

export { auditLogJobKeyOf, auditLogJobOf, mergeAuditLogJobs };
