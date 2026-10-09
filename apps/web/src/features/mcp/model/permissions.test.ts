import { PermissionFlagsBits } from "discord-api-types/v10";
import { expect, it } from "vite-plus/test";

import { canManageGuild } from "./permissions";
import type { ReaderContext } from "./permissions";

const GUILD = "100";
const OWNER = "200";
const USER = "300";
const MANAGER_ROLE = "400";
const ADMIN_ROLE = "500";

const readerOf = (userId: string, memberRoleIds: readonly string[]): ReaderContext => ({
  guildId: GUILD,
  ownerId: OWNER,
  userId,
  memberRoleIds,
  rolePermissions: {
    [GUILD]: PermissionFlagsBits.ViewChannel.toString(),
    [MANAGER_ROLE]: PermissionFlagsBits.ManageGuild.toString(),
    [ADMIN_ROLE]: PermissionFlagsBits.Administrator.toString(),
  },
});

it("lets the owner, administrators and server managers manage the server", () => {
  expect(canManageGuild(readerOf(OWNER, []))).toBe(true);
  expect(canManageGuild(readerOf(USER, [ADMIN_ROLE]))).toBe(true);
  expect(canManageGuild(readerOf(USER, [MANAGER_ROLE]))).toBe(true);
});

it("does not let an ordinary member manage the server", () => {
  expect(canManageGuild(readerOf(USER, []))).toBe(false);
});
