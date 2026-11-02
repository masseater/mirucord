import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import type { Discord } from "dfx";
import { Option, Schema } from "effect";

const GuildEvent = Schema.Struct({ id: Schema.String });

const GuildChangeEvent = Schema.Struct({ guild_id: Schema.optionalKey(Schema.String) });

const decodeGuild = Schema.decodeOption(GuildEvent);
const decodeGuildChange = Schema.decodeOption(GuildChangeEvent);
const joinJob = (data: typeof GuildEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => ({ kind: "join", guildId: id })));

const leaveJob = (
  data: Readonly<Discord.GatewayGuildDeleteDispatchData>,
): Option.Option<GatewayJob> =>
  Option.liftPredicate(data, ({ unavailable }) => unavailable !== true).pipe(
    Option.map(({ id }) => ({ kind: "leave", guildId: id })),
  );

const resyncJob = (): Option.Option<GatewayJob> => Option.some({ kind: "resync" });

const syncJobOf = (guildId: string): GatewayJob => ({ kind: "sync", guildId });

const syncJob = (data: typeof GuildChangeEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuildChange(data).pipe(
    Option.flatMap(({ guild_id }) => Option.fromUndefinedOr(guild_id)),
    Option.map(syncJobOf),
  );

const guildUpdateJob = (data: typeof GuildEvent.Encoded): Option.Option<GatewayJob> =>
  decodeGuild(data).pipe(Option.map(({ id }) => syncJobOf(id)));

export { guildUpdateJob, joinJob, leaveJob, resyncJob, syncJob, syncJobOf };
