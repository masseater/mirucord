import { ChannelType } from "discord-api-types/v10";
import { expect, it } from "vite-plus/test";

import { inDiscordOrder } from "./channel-order";

it("puts voice channels after text channels, then follows the position", () => {
  const channels = [
    { id: "1", type: ChannelType.GuildVoice, position: 0 },
    { id: "2", type: ChannelType.GuildText, position: 2 },
    { id: "3", type: ChannelType.GuildForum, position: 1 },
    { id: "4", type: ChannelType.GuildStageVoice, position: 1 },
  ];
  expect(inDiscordOrder(channels).map(({ id }) => id)).toStrictEqual(["3", "2", "1", "4"]);
});

it("breaks a position tie by id", () => {
  const channels = [
    { id: "20", type: ChannelType.GuildText, position: 0 },
    { id: "3", type: ChannelType.GuildText, position: 0 },
  ];
  expect(inDiscordOrder(channels).map(({ id }) => id)).toStrictEqual(["3", "20"]);
});
