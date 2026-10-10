import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import { Option } from "effect";
import { expect, it } from "vite-plus/test";

import { visibleChannelIds } from "./visibility";
import type { GuildChannel, GuildSnapshot, Member } from "./visibility";

const GUILD = "100";
const OWNER = "200";
const USER = "300";
const MEMBER_ROLE = "400";
const ADMIN_ROLE = "500";
const NOTHING = "0";

const READ_BITS = PermissionFlagsBits.ViewChannel + PermissionFlagsBits.ReadMessageHistory;
const READ = READ_BITS.toString();
const VIEW = PermissionFlagsBits.ViewChannel.toString();
const ADMINISTRATOR = PermissionFlagsBits.Administrator.toString();

const textChannel = (
  id: string,
  permissionOverwrites: GuildChannel["permissionOverwrites"],
): GuildChannel => ({
  id,
  parentId: Option.none(),
  type: ChannelType.GuildText,
  permissionOverwrites,
});

const voiceChannel = (
  id: string,
  permissionOverwrites: GuildChannel["permissionOverwrites"],
): GuildChannel => ({ ...textChannel(id, permissionOverwrites), type: ChannelType.GuildVoice });

const snapshotOf = (channels: readonly GuildChannel[]): GuildSnapshot => ({
  guildId: GUILD,
  ownerId: OWNER,
  rolePermissions: {
    [GUILD]: READ,
    [MEMBER_ROLE]: NOTHING,
    [ADMIN_ROLE]: ADMINISTRATOR,
  },
  channels,
});

const member = (userId: string, roleIds: readonly string[]): Option.Option<Member> =>
  Option.some({ userId, roleIds });

it("shows nothing to someone who is not a member", () => {
  const snapshot = snapshotOf([textChannel("1", [])]);
  expect([...visibleChannelIds(snapshot, Option.none())]).toStrictEqual([]);
});

it("shows a channel that @everyone is denied but a role is allowed", () => {
  const snapshot = snapshotOf([
    textChannel("1", [
      { id: GUILD, type: OverwriteType.Role, allow: NOTHING, deny: VIEW },
      { id: MEMBER_ROLE, type: OverwriteType.Role, allow: VIEW, deny: NOTHING },
    ]),
  ]);
  expect([...visibleChannelIds(snapshot, member(USER, [MEMBER_ROLE]))]).toStrictEqual(["1"]);
});

it("lets a member deny win over a role allow", () => {
  const snapshot = snapshotOf([
    textChannel("1", [
      { id: MEMBER_ROLE, type: OverwriteType.Role, allow: VIEW, deny: NOTHING },
      { id: USER, type: OverwriteType.Member, allow: NOTHING, deny: VIEW },
    ]),
  ]);
  expect([...visibleChannelIds(snapshot, member(USER, [MEMBER_ROLE]))]).toStrictEqual([]);
});

it("shows every channel to the owner and to administrators", () => {
  const hidden = [{ id: GUILD, type: OverwriteType.Role, allow: NOTHING, deny: VIEW }];
  const snapshot = snapshotOf([textChannel("1", hidden), textChannel("2", hidden)]);
  expect([...visibleChannelIds(snapshot, member(OWNER, []))]).toStrictEqual(["1", "2"]);
  expect([...visibleChannelIds(snapshot, member(USER, [ADMIN_ROLE]))]).toStrictEqual(["1", "2"]);
});

it("hides a thread whose parent channel is hidden", () => {
  const snapshot = snapshotOf([
    textChannel("1", [{ id: GUILD, type: OverwriteType.Role, allow: NOTHING, deny: VIEW }]),
    textChannel("2", []),
    {
      id: "11",
      parentId: Option.some("1"),
      type: ChannelType.PublicThread,
      permissionOverwrites: [],
    },
    {
      id: "12",
      parentId: Option.some("2"),
      type: ChannelType.PublicThread,
      permissionOverwrites: [],
    },
    {
      id: "13",
      parentId: Option.some("2"),
      type: ChannelType.PrivateThread,
      permissionOverwrites: [],
    },
  ]);
  expect([...visibleChannelIds(snapshot, member(USER, []))]).toStrictEqual(["2", "12"]);
});

it("shows the posts of a forum the reader can see", () => {
  const snapshot = snapshotOf([
    { ...textChannel("1", []), type: ChannelType.GuildForum },
    {
      ...textChannel("2", [{ id: GUILD, type: OverwriteType.Role, allow: NOTHING, deny: VIEW }]),
      type: ChannelType.GuildForum,
    },
    {
      id: "11",
      parentId: Option.some("1"),
      type: ChannelType.PublicThread,
      permissionOverwrites: [],
    },
    {
      id: "21",
      parentId: Option.some("2"),
      type: ChannelType.PublicThread,
      permissionOverwrites: [],
    },
  ]);
  expect([...visibleChannelIds(snapshot, member(USER, []))]).toStrictEqual(["1", "11"]);
});

it("needs connect to read the text chat of a voice channel", () => {
  const CONNECT = (READ_BITS + PermissionFlagsBits.Connect).toString();
  const snapshot = snapshotOf([
    voiceChannel("1", [{ id: GUILD, type: OverwriteType.Role, allow: CONNECT, deny: NOTHING }]),
    voiceChannel("2", []),
  ]);
  expect([...visibleChannelIds(snapshot, member(USER, []))]).toStrictEqual(["1"]);
});
