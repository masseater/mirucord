import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { DiscordSnowflake } from "@sapphire/snowflake";
import { Discord } from "dfx";
import { Option, Record } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJobs } from "./gateway-job";

const NOW = 5000;
const NO_REASON = Option.getOrNull(Option.none<string>());
const ENTRY_ID = "1434500000000000000";
const MEMBER_ROLE_UPDATE = 25;

const jobsOf = (data: unknown): readonly GatewayJob[] =>
  toGatewayJobs({
    payload: {
      op: Discord.GatewayOpcodes.Dispatch,
      ...Record.fromEntries([
        ["t", Discord.GatewayDispatchEvents.GuildAuditLogEntryCreate],
        ["d", data],
      ]),
    },
    now: NOW,
  });

const CHANGES = [{ key: "$add", new_value: [{ id: "150", name: "member" }] }];

it("carries who did what to whom, timed by the entry's ID", () => {
  const jobs = jobsOf({
    id: ENTRY_ID,
    guild_id: "700",
    action_type: MEMBER_ROLE_UPDATE,
    user_id: "901",
    target_id: "902",
    changes: CHANGES,
  });
  expect(mergeJobs(jobs)).toStrictEqual([
    {
      kind: "auditLog",
      guildId: "700",
      changes: [
        {
          entryId: ENTRY_ID,
          actionType: MEMBER_ROLE_UPDATE,
          userId: "901",
          targetId: "902",
          at: DiscordSnowflake.timestampFrom(ENTRY_ID),
          detail: JSON.stringify({ reason: NO_REASON, changes: CHANGES }),
        },
      ],
    },
  ]);
});

it("ignores an entry it cannot read", () => {
  expect(jobsOf({ id: ENTRY_ID })).toStrictEqual([]);
});
