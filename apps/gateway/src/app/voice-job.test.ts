import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Option, Record } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJobs } from "./gateway-job";

const JOINED_AT = 1000;
const MOVED_AT = 2000;
const SNAPSHOT_AT = 1500;
const LEFT = Option.getOrNull(Option.none<string>());

const jobsOf = (
  event: Discord.GatewayDispatchEvents,
  data: unknown,
  now: number,
): readonly GatewayJob[] =>
  toGatewayJobs({
    payload: {
      op: Discord.GatewayOpcodes.Dispatch,
      ...Record.fromEntries([
        ["t", event],
        ["d", data],
      ]),
    },
    now,
  });

const voiceState = (channelId: string | null): unknown => ({
  guild_id: "700",
  channel_id: channelId,
  user_id: "901",
  session_id: "s",
});

it("carries a voice join, move, or leave with the time the gateway saw it", () => {
  expect(
    jobsOf(Discord.GatewayDispatchEvents.VoiceStateUpdate, voiceState("720"), JOINED_AT),
  ).toStrictEqual([
    {
      kind: "voice",
      guildId: "700",
      changes: [{ userId: "901", channelId: "720", at: JOINED_AT }],
    },
  ]);
});

it("takes who is in voice when a server becomes available", () => {
  expect(
    jobsOf(
      Discord.GatewayDispatchEvents.GuildCreate,
      {
        id: "700",
        voice_states: [
          { channel_id: "720", user_id: "901", session_id: "s" },
          { channel_id: LEFT, user_id: "902", session_id: "t" },
        ],
      },
      SNAPSHOT_AT,
    ),
  ).toStrictEqual([
    { kind: "join", guildId: "700" },
    {
      kind: "voiceSnapshot",
      guildId: "700",
      at: SNAPSHOT_AT,
      present: [{ userId: "901", channelId: "720" }],
    },
  ]);
});

it("keeps every voice change in order and drops those older than a snapshot", () => {
  const joined = jobsOf(
    Discord.GatewayDispatchEvents.VoiceStateUpdate,
    voiceState("720"),
    JOINED_AT,
  );
  const snapshot: GatewayJob = {
    kind: "voiceSnapshot",
    guildId: "700",
    at: SNAPSHOT_AT,
    present: [],
  };
  const moved = jobsOf(Discord.GatewayDispatchEvents.VoiceStateUpdate, voiceState("721"), MOVED_AT);
  const left = jobsOf(Discord.GatewayDispatchEvents.VoiceStateUpdate, voiceState(LEFT), MOVED_AT);
  expect(mergeJobs([...joined, snapshot, ...moved, ...left])).toStrictEqual([
    snapshot,
    {
      kind: "voice",
      guildId: "700",
      changes: [
        { userId: "901", channelId: "721", at: MOVED_AT },
        { userId: "901", channelId: LEFT, at: MOVED_AT },
      ],
    },
  ]);
});
