import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { GatewayDispatchEvents, GatewayOpcodes } from "discord-api-types/v10";
import { Array, Option } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJob } from "./gateway-job";

const BURST = 150;
const FIRST_ID = 1000;
const MESSAGES_PER_JOB = 100;

const MESSAGE = { id: "711", channel_id: "710", guild_id: "700" };

const jobOf = (event: GatewayDispatchEvents, data: unknown): Option.Option<GatewayJob> =>
  toGatewayJob({
    op: GatewayOpcodes.Dispatch,
    ...Object.fromEntries([
      ["t", event],
      ["d", data],
    ]),
  });

const FULL_MESSAGE = {
  ...MESSAGE,
  type: 0,
  content: "hello",
  timestamp: "2026-10-01T00:00:00Z",
  edited_timestamp: Option.getOrNull(Option.none<string>()),
  author: { id: "901", username: "someone" },
  attachments: [],
};

const storedContents = (job: GatewayJob): readonly string[] => {
  if (job.kind !== "store") {
    return [];
  }
  return job.messages.map(({ content }) => content);
};

it("carries a created or edited message with its body", () => {
  for (const event of [GatewayDispatchEvents.MessageCreate, GatewayDispatchEvents.MessageUpdate]) {
    const jobs = Option.toArray(jobOf(event, { ...FULL_MESSAGE, extra: "ignored" }));
    expect(jobs.map(({ kind }) => kind)).toStrictEqual(["store"]);
    expect(jobs.map((job) => storedContents(job))).toStrictEqual([["hello"]]);
  }
});

it("keeps the latest body of a message edited twice in a row", () => {
  const edits = ["first", "second"].map((content) =>
    jobOf(GatewayDispatchEvents.MessageUpdate, { ...FULL_MESSAGE, content }),
  );
  const merged = mergeJobs(edits.flatMap((job) => Option.toArray(job)));
  expect(merged.map((job) => storedContents(job))).toStrictEqual([["second"]]);
});

it("asks to refresh an edit that arrives without the whole message", () => {
  expect(jobOf(GatewayDispatchEvents.MessageUpdate, MESSAGE)).toStrictEqual(
    Option.some({ kind: "refresh", guildId: "700", channelId: "710", messageIds: ["711"] }),
  );
});

it("asks to forget deleted messages", () => {
  expect(jobOf(GatewayDispatchEvents.MessageDelete, MESSAGE)).toStrictEqual(
    Option.some({ kind: "forget", guildId: "700", channelId: "710", messageIds: ["711"] }),
  );
  expect(
    jobOf(GatewayDispatchEvents.MessageDeleteBulk, {
      ids: ["711", "712"],
      channel_id: "710",
      guild_id: "700",
    }),
  ).toStrictEqual(
    Option.some({ kind: "forget", guildId: "700", channelId: "710", messageIds: ["711", "712"] }),
  );
});

it("ignores direct messages and other events", () => {
  expect(jobOf(GatewayDispatchEvents.MessageCreate, { id: "1", channel_id: "2" })).toStrictEqual(
    Option.none(),
  );
  expect(jobOf(GatewayDispatchEvents.TypingStart, MESSAGE)).toStrictEqual(Option.none());
  expect(toGatewayJob({ op: GatewayOpcodes.HeartbeatAck })).toStrictEqual(Option.none());
});

it("asks to welcome a server the bot has joined", () => {
  expect(jobOf(GatewayDispatchEvents.GuildCreate, { id: "700", name: "x" })).toStrictEqual(
    Option.some({ kind: "join", guildId: "700" }),
  );
});

it("asks to forget a server the bot was removed from, but not one that is only unavailable", () => {
  expect(jobOf(GatewayDispatchEvents.GuildDelete, { id: "700" })).toStrictEqual(
    Option.some({ kind: "leave", guildId: "700" }),
  );
  expect(jobOf(GatewayDispatchEvents.GuildDelete, { id: "700", unavailable: true })).toStrictEqual(
    Option.none(),
  );
});

it("asks to catch up once when the gateway starts a new session", () => {
  expect(jobOf(GatewayDispatchEvents.Ready, {})).toStrictEqual(Option.some({ kind: "resync" }));
  expect(jobOf(GatewayDispatchEvents.Resumed, {})).toStrictEqual(Option.none());
  expect(
    mergeJobs([{ kind: "resync" }, { kind: "join", guildId: "700" }, { kind: "resync" }]),
  ).toStrictEqual([{ kind: "resync" }, { kind: "join", guildId: "700" }]);
});

it("keeps only the latest join or leave of each server and skips its sync", () => {
  expect(
    mergeJobs([
      { kind: "join", guildId: "700" },
      { kind: "sync", guildId: "700" },
      { kind: "leave", guildId: "700" },
      { kind: "leave", guildId: "800" },
      { kind: "join", guildId: "800" },
    ]),
  ).toStrictEqual([
    { kind: "leave", guildId: "700" },
    { kind: "join", guildId: "800" },
  ]);
});

it("merges events into one job per channel and keeps each message's latest event", () => {
  expect(
    mergeJobs([
      { kind: "join", guildId: "700" },
      { kind: "refresh", guildId: "700", channelId: "710", messageIds: ["711"] },
      { kind: "refresh", guildId: "700", channelId: "710", messageIds: ["712"] },
      { kind: "refresh", guildId: "700", channelId: "720", messageIds: ["721"] },
      { kind: "refresh", guildId: "700", channelId: "710", messageIds: ["711"] },
      { kind: "forget", guildId: "700", channelId: "710", messageIds: ["712", "713"] },
      { kind: "join", guildId: "700" },
    ]),
  ).toStrictEqual([
    { kind: "join", guildId: "700" },
    { kind: "refresh", guildId: "700", channelId: "710", messageIds: ["711"] },
    { kind: "forget", guildId: "700", channelId: "710", messageIds: ["712", "713"] },
    { kind: "refresh", guildId: "700", channelId: "720", messageIds: ["721"] },
  ]);
});

it("splits a large burst into jobs of at most a hundred messages", () => {
  const ids = Array.makeBy(BURST, (index) => String(FIRST_ID + index));
  const job = { kind: "refresh", guildId: "700", channelId: "710" } as const;
  expect(mergeJobs(ids.map((id) => ({ ...job, messageIds: [id] })))).toStrictEqual([
    { ...job, messageIds: Array.take(ids, MESSAGES_PER_JOB) },
    { ...job, messageIds: Array.drop(ids, MESSAGES_PER_JOB) },
  ]);
});

it("asks to sync a server whose channels, threads, or roles changed", () => {
  for (const event of [
    GatewayDispatchEvents.ChannelUpdate,
    GatewayDispatchEvents.ThreadCreate,
    GatewayDispatchEvents.GuildRoleUpdate,
  ]) {
    expect(jobOf(event, { id: "710", guild_id: "700" })).toStrictEqual(
      Option.some({ kind: "sync", guildId: "700" }),
    );
  }
  expect(jobOf(GatewayDispatchEvents.GuildUpdate, { id: "700" })).toStrictEqual(
    Option.some({ kind: "sync", guildId: "700" }),
  );
  expect(jobOf(GatewayDispatchEvents.ChannelCreate, { id: "1", type: 1 })).toStrictEqual(
    Option.none(),
  );
});

it("syncs each changed server once and not right after it joined", () => {
  expect(
    mergeJobs([
      { kind: "sync", guildId: "700" },
      { kind: "sync", guildId: "800" },
      { kind: "join", guildId: "800" },
      { kind: "sync", guildId: "700" },
    ]),
  ).toStrictEqual([
    { kind: "join", guildId: "800" },
    { kind: "sync", guildId: "700" },
  ]);
});
