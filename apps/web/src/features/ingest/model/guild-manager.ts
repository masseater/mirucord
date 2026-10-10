import { BitField } from "@sapphire/bitfield";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { Option, Record } from "effect";

type ManagerCandidate = Readonly<{
  guildId: string;
  ownerId: string;
  userId: string;
  memberRoleIds: readonly string[];
  rolePermissions: Readonly<Record<string, string>>;
}>;

const Permissions = new BitField(PermissionFlagsBits);
const MANAGE = Permissions.union("Administrator", "ManageGuild");

const isGuildManager = (candidate: ManagerCandidate): boolean =>
  candidate.userId === candidate.ownerId ||
  Permissions.any(
    Permissions.union(
      ...[candidate.guildId, ...candidate.memberRoleIds].map((roleId) =>
        Option.getOrElse(
          Option.map(Record.get(candidate.rolePermissions, roleId), BigInt),
          () => Permissions.zero,
        ),
      ),
    ),
    MANAGE,
  );

export { isGuildManager };
export type { ManagerCandidate };
