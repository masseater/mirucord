import { GatewayDispatchEvents } from "discord-api-types/v10";
import { Array, Option } from "effect";
import { expect, it } from "vite-plus/test";

import { mergeJobs, toGatewayJob } from "./gateway-job";

const BURST = 150;
const FIRST_ID = 1000;
const MESSAGES_PER_JOB = 100;

const MESSAGE = { id: "711", channel_id: "710", guild_id: "700" };

it("asks to refresh a created or edited message", () => {
  for (const event of [GatewayDispatchEvents.MessageCreate, GatewayDispatchEvents.MessageUpdate]) {
    expect(toGatewayJob({ event, data: MESSAGE })).toStrictEqual(
      Option.some({ kind: "refresh", guildId: "700", channelId: "710", messageIds: ["711"] }),
    );
  }
});

it("asks to forget deleted messages", () => {
  expect(toGatewayJob({ event: GatewayDispatchEvents.MessageDelete, data: MESSAGE })).toStrictEqual(
    Option.some({ kind: "forget", guildId: "700", channelId: "710", messageIds: ["711"] }),
  );
  expect(
    toGatewayJob({
      event: GatewayDispatchEvents.MessageDeleteBulk,
      data: { ids: ["711", "712"], channel_id: "710", guild_id: "700" },
    }),
  ).toStrictEqual(
    Option.some({ kind: "forget", guildId: "700", channelId: "710", messageIds: ["711", "712"] }),
  );
});

it("ignores direct messages and other events", () => {
  expect(
    toGatewayJob({
      event: GatewayDispatchEvents.MessageCreate,
      data: { id: "1", channel_id: "2" },
    }),
  ).toStrictEqual(Option.none());
  expect(toGatewayJob({ event: GatewayDispatchEvents.TypingStart, data: MESSAGE })).toStrictEqual(
    Option.none(),
  );
});

it("asks to welcome a server the bot has joined", () => {
  expect(
    toGatewayJob({ event: GatewayDispatchEvents.GuildCreate, data: { id: "700", name: "x" } }),
  ).toStrictEqual(Option.some({ kind: "join", guildId: "700" }));
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
