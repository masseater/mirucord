import { ChannelType } from "discord-api-types/v10";
import { expect, it } from "vite-plus/test";

import { kindOf, LISTED_TYPES, MESSAGE_TYPES, STORED_TYPES } from "./channel-kind";

it("names each kind of channel", () => {
  expect(kindOf(ChannelType.GuildText)).toBe("text");
  expect(kindOf(ChannelType.GuildAnnouncement)).toBe("announcement");
  expect(kindOf(ChannelType.GuildVoice)).toBe("voice");
  expect(kindOf(ChannelType.GuildStageVoice)).toBe("stage");
  expect(kindOf(ChannelType.GuildForum)).toBe("forum");
  expect(kindOf(ChannelType.GuildMedia)).toBe("forum");
});

it("reads the text chat of voice and stage channels", () => {
  expect(MESSAGE_TYPES.has(ChannelType.GuildVoice)).toBe(true);
  expect(MESSAGE_TYPES.has(ChannelType.GuildStageVoice)).toBe(true);
  expect(LISTED_TYPES.has(ChannelType.GuildVoice)).toBe(true);
});

it("keeps forums and categories without reading messages from them", () => {
  expect(STORED_TYPES.has(ChannelType.GuildForum)).toBe(true);
  expect(STORED_TYPES.has(ChannelType.GuildCategory)).toBe(true);
  expect(MESSAGE_TYPES.has(ChannelType.GuildForum)).toBe(false);
  expect(MESSAGE_TYPES.has(ChannelType.GuildCategory)).toBe(false);
  expect(LISTED_TYPES.has(ChannelType.GuildCategory)).toBe(false);
});

it("leaves out private threads and direct messages", () => {
  expect(STORED_TYPES.has(ChannelType.PrivateThread)).toBe(false);
  expect(STORED_TYPES.has(ChannelType.DM)).toBe(false);
  expect(STORED_TYPES.has(ChannelType.GroupDM)).toBe(false);
});
