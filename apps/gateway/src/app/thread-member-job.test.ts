import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Record } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJobs } from "./gateway-job";

const NOW = 5000;
const JOINED_AT = "2026-11-02T09:00:00.000Z";

const jobsOf = (data: unknown): readonly GatewayJob[] =>
  toGatewayJobs({
    payload: {
      op: Discord.GatewayOpcodes.Dispatch,
      ...Record.fromEntries([
        ["t", Discord.GatewayDispatchEvents.ThreadMembersUpdate],
        ["d", data],
      ]),
    },
    now: NOW,
  });

it("carries who joined a thread at Discord's join time and who left it now", () => {
  const joined = jobsOf({
    id: "730",
    guild_id: "700",
    member_count: 2,
    added_members: [{ id: "730", user_id: "901", join_timestamp: JOINED_AT, flags: 0 }],
  });
  const left = jobsOf({
    id: "731",
    guild_id: "700",
    member_count: 0,
    removed_member_ids: ["902"],
  });
  expect(mergeJobs([...joined, ...left])).toStrictEqual([
    {
      kind: "threadMembers",
      guildId: "700",
      changes: [
        { kind: "join", threadId: "730", userId: "901", at: Date.parse(JOINED_AT) },
        { kind: "leave", threadId: "731", userId: "902", at: NOW },
      ],
    },
  ]);
});

it("ignores an update that adds and removes nobody", () => {
  expect(jobsOf({ id: "730", guild_id: "700", member_count: 1 })).toStrictEqual([]);
});
