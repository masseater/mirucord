import { GatewayDispatchEvents } from "discord-api-types/v10";
import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { toGatewayJob } from "./gateway-job";

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
