import { Discord } from "dfx";
import { DateTime, Option, Record } from "effect";

import type { StoredScheduledEvent } from "#/entities/guild-message/index.server";
import type { ListScheduledEventsOutput } from "#/features/mcp/api/tool-output";

import { labelOf } from "./constant-label";

type EventView = (typeof ListScheduledEventsOutput.Type)["events"][number];

const kindOf = labelOf(Discord.GuildScheduledEventEntityTypes);

const statusOf = labelOf(Discord.GuildScheduledEventStatuses);

const isoOf = (at: number | null): string | null =>
  Option.getOrNull(
    Option.map(Option.fromNullOr(at), (millis) => DateTime.formatIso(DateTime.makeUnsafe(millis))),
  );

const viewOf =
  (names: Record.ReadonlyRecord<string, string>) =>
  (event: StoredScheduledEvent): EventView => ({
    eventId: event.id,
    name: event.name,
    description: event.description,
    channelId: event.channelId,
    channelName: Option.getOrNull(
      Option.flatMap(Option.fromNullOr(event.channelId), (id) => Record.get(names, id)),
    ),
    creatorId: event.creatorId,
    location: event.location,
    kind: kindOf(event.entityType),
    status: statusOf(event.status),
    startsAt: DateTime.formatIso(DateTime.makeUnsafe(event.startsAt)),
    endsAt: isoOf(event.endsAt),
    recurring: event.recurring,
    removedAt: isoOf(event.removedAt),
    interestedUserIds: event.interestedUserIds,
  });

export { viewOf };
export type { EventView };
