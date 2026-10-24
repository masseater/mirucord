import type { GatewayJob } from "@repo/ingest-util-gateway-contract";
import { Discord } from "dfx";
import { Array, Option, pipe, Record } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJob } from "./gateway-job";

const BURST = 150;
const FIRST_ID = 1000;
const MESSAGES_PER_JOB = 100;

const MESSAGE = { id: "711", channel_id: "710", guild_id: "700" };

const jobOf = (event: Discord.GatewayDispatchEvents, data: unknown): Option.Option<GatewayJob> =>
  toGatewayJob({
    op: Discord.GatewayOpcodes.Dispatch,
    ...Record.fromEntries([
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
  return pipe(
    job.messages,
    Array.map(({ content }) => content),
  );
};

it("carries a created or edited message with its body", () => {
  for (const event of [
    Discord.GatewayDispatchEvents.MessageCreate,
    Discord.GatewayDispatchEvents.MessageUpdate,
  ]) {
    const jobs = Option.toArray(jobOf(event, { ...FULL_MESSAGE, extra: "ignored" }));
    expect(
      pipe(
        jobs,
        Array.map(({ kind }) => kind),
      ),
    ).toStrictEqual(["store"]);
    expect(
      pipe(
        jobs,
        Array.map((job) => storedContents(job)),
      ),
    ).toStrictEqual([["hello"]]);
  }
});

it("keeps the latest body of a message edited twice in a row", () => {
  const edits = pipe(
    ["first", "second"],
    Array.map((content) =>
      jobOf(Discord.GatewayDispatchEvents.MessageUpdate, { ...FULL_MESSAGE, content }),
    ),
  );
  const merged = mergeJobs(
    pipe(
      edits,
      Array.flatMap((job) => Option.toArray(job)),
    ),
  );
  expect(
    pipe(
      merged,
      Array.map((job) => storedContents(job)),
    ),
  ).toStrictEqual([["second"]]);
});

it("asks to refresh an edit that arrives without the whole message", () => {
  expect(jobOf(Discord.GatewayDispatchEvents.MessageUpdate, MESSAGE)).toStrictEqual(
    Option.some({ kind: "refresh", guildId: "700", channelId: "710", messageIds: ["711"] }),
  );
});

it("asks to forget deleted messages", () => {
  expect(jobOf(Discord.GatewayDispatchEvents.MessageDelete, MESSAGE)).toStrictEqual(
    Option.some({ kind: "forget", guildId: "700", channelId: "710", messageIds: ["711"] }),
  );
  expect(
    jobOf(Discord.GatewayDispatchEvents.MessageDeleteBulk, {
      ids: ["711", "712"],
      channel_id: "710",
      guild_id: "700",
    }),
  ).toStrictEqual(
    Option.some({ kind: "forget", guildId: "700", channelId: "710", messageIds: ["711", "712"] }),
  );
});

it("ignores direct messages and other events", () => {
  expect(
    jobOf(Discord.GatewayDispatchEvents.MessageCreate, { id: "1", channel_id: "2" }),
  ).toStrictEqual(Option.none());
  expect(jobOf(Discord.GatewayDispatchEvents.TypingStart, MESSAGE)).toStrictEqual(Option.none());
  expect(toGatewayJob({ op: Discord.GatewayOpcodes.HeartbeatAck })).toStrictEqual(Option.none());
});

it("asks to welcome a server the bot has joined", () => {
  expect(jobOf(Discord.GatewayDispatchEvents.GuildCreate, { id: "700", name: "x" })).toStrictEqual(
    Option.some({ kind: "join", guildId: "700" }),
  );
});

it("asks to forget a server the bot was removed from, but not one that is only unavailable", () => {
  expect(jobOf(Discord.GatewayDispatchEvents.GuildDelete, { id: "700" })).toStrictEqual(
    Option.some({ kind: "leave", guildId: "700" }),
  );
  expect(
    jobOf(Discord.GatewayDispatchEvents.GuildDelete, { id: "700", unavailable: true }),
  ).toStrictEqual(Option.none());
});

it("asks to catch up once when the gateway starts a new session", () => {
  expect(jobOf(Discord.GatewayDispatchEvents.Ready, {})).toStrictEqual(
    Option.some({ kind: "resync" }),
  );
  expect(jobOf(Discord.GatewayDispatchEvents.Resumed, {})).toStrictEqual(Option.none());
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
  const burst = pipe(
    ids,
    Array.map((id): GatewayJob => ({ ...job, messageIds: [id] })),
  );
  expect(mergeJobs(burst)).toStrictEqual([
    { ...job, messageIds: Array.take(ids, MESSAGES_PER_JOB) },
    { ...job, messageIds: Array.drop(ids, MESSAGES_PER_JOB) },
  ]);
});

it("asks to sync a server whose channels, threads, or roles changed", () => {
  for (const event of [
    Discord.GatewayDispatchEvents.ChannelUpdate,
    Discord.GatewayDispatchEvents.ThreadCreate,
    Discord.GatewayDispatchEvents.GuildRoleUpdate,
  ]) {
    expect(jobOf(event, { id: "710", guild_id: "700" })).toStrictEqual(
      Option.some({ kind: "sync", guildId: "700" }),
    );
  }
  expect(jobOf(Discord.GatewayDispatchEvents.GuildUpdate, { id: "700" })).toStrictEqual(
    Option.some({ kind: "sync", guildId: "700" }),
  );
  expect(jobOf(Discord.GatewayDispatchEvents.ChannelCreate, { id: "1", type: 1 })).toStrictEqual(
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
