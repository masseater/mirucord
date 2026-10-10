import { PermissionFlagsBits } from "discord-api-types/v10";
import { expect, it } from "vite-plus/test";

import { isGuildManager } from "./guild-manager";

const GUILD = "100";
const OWNER = "200";
const USER = "300";
const MANAGER_ROLE = "400";
const NOTHING = "0";

const rolePermissions = {
  [GUILD]: PermissionFlagsBits.ViewChannel.toString(),
  [MANAGER_ROLE]: PermissionFlagsBits.ManageGuild.toString(),
};

it("treats the owner as a manager", () => {
  expect(
    isGuildManager({
      guildId: GUILD,
      ownerId: OWNER,
      userId: OWNER,
      memberRoleIds: [],
      rolePermissions,
    }),
  ).toBe(true);
});

it("requires Manage Server or Administrator for other members", () => {
  const member = { guildId: GUILD, ownerId: OWNER, userId: USER, rolePermissions };
  expect(isGuildManager({ ...member, memberRoleIds: [MANAGER_ROLE] })).toBe(true);
  expect(isGuildManager({ ...member, memberRoleIds: [] })).toBe(false);
  expect(
    isGuildManager({ ...member, memberRoleIds: [], rolePermissions: { [GUILD]: NOTHING } }),
  ).toBe(false);
});
