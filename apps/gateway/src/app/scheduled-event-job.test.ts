import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Array, Option, pipe, Record } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJobs } from "./gateway-job";

const NOW = 5000;
const STARTS_AT = "2026-11-10T12:00:00.000Z";
const NOTHING = Option.getOrNull(Option.none<string>());

const jobsOf = (event: Discord.GatewayDispatchEvents, data: unknown): readonly GatewayJob[] =>
  toGatewayJobs({
    payload: {
      op: Discord.GatewayOpcodes.Dispatch,
      ...Record.fromEntries([
        ["t", event],
        ["d", data],
      ]),
    },
    now: NOW,
  });

const EVENT = {
  id: "720",
  guild_id: "700",
  name: "Movie night",
  description: NOTHING,
  channel_id: "710",
  creator_id: "901",
  entity_type: 2,
  status: 1,
  scheduled_start_time: STARTS_AT,
  scheduled_end_time: NOTHING,
  entity_metadata: NOTHING,
  recurrence_rule: NOTHING,
  privacy_level: 2,
};

const SCHEDULED = {
  kind: "schedule",
  eventId: "720",
  at: NOW,
  name: "Movie night",
  description: NOTHING,
  channelId: "710",
  creatorId: "901",
  location: NOTHING,
  entityType: 2,
  status: 1,
  startsAt: Date.parse(STARTS_AT),
  endsAt: NOTHING,
  recurring: false,
};

it("carries a created event and who became interested in it", () => {
  const created = jobsOf(Discord.GatewayDispatchEvents.GuildScheduledEventCreate, EVENT);
  const interested = jobsOf(Discord.GatewayDispatchEvents.GuildScheduledEventUserAdd, {
    guild_id: "700",
    guild_scheduled_event_id: "720",
    user_id: "902",
  });
  expect(mergeJobs([...created, ...interested])).toStrictEqual([
    {
      kind: "scheduledEvents",
      guildId: "700",
      changes: [SCHEDULED, { kind: "interest", eventId: "720", userId: "902", at: NOW }],
    },
  ]);
});

it("schedules the events a server lists when the bot connects", () => {
  const jobs = jobsOf(Discord.GatewayDispatchEvents.GuildCreate, {
    id: "700",
    guild_scheduled_events: [EVENT],
  });
  const scheduled = pipe(
    jobs,
    Array.filter(({ kind }) => kind === "scheduledEvents"),
  );
  expect(scheduled).toStrictEqual([
    { kind: "scheduledEvents", guildId: "700", changes: [SCHEDULED] },
  ]);
});
