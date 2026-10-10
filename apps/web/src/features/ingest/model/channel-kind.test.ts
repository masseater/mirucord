import { ChannelType } from "discord-api-types/v10";
import { expect, it } from "vite-plus/test";

import { kindOf, STORED_TYPES, THREAD_PARENT_TYPES } from "./channel-kind";

it("tells forums apart from text channels", () => {
  expect(kindOf(ChannelType.GuildForum)).toBe("forum");
  expect(kindOf(ChannelType.GuildMedia)).toBe("forum");
  expect(kindOf(ChannelType.GuildText)).toBe("text");
  expect(kindOf(ChannelType.GuildAnnouncement)).toBe("text");
});

it("keeps forums and their posts", () => {
  expect(THREAD_PARENT_TYPES.has(ChannelType.GuildForum)).toBe(true);
  expect(STORED_TYPES.has(ChannelType.GuildForum)).toBe(true);
  expect(STORED_TYPES.has(ChannelType.PublicThread)).toBe(true);
});

it("leaves out private threads and voice channels", () => {
  expect(STORED_TYPES.has(ChannelType.PrivateThread)).toBe(false);
  expect(STORED_TYPES.has(ChannelType.GuildVoice)).toBe(false);
});
