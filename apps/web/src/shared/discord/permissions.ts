import { OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";

type Overwrite = Readonly<{ id: string; type: number; allow: string; deny: string }>;

type ReaderContext = Readonly<{
  guildId: string;
  ownerId: string;
  userId: string;
  memberRoleIds: readonly string[];
  rolePermissions: ReadonlyMap<string, string>;
}>;

const NONE = 0n;
const READ_HISTORY = PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ReadMessageHistory;

const applyOverwrite = (permissions: bigint, allow: bigint, deny: bigint): bigint =>
  (permissions & ~deny) | allow;

const basePermissions = (reader: ReaderContext): bigint =>
  [reader.guildId, ...reader.memberRoleIds].reduce(
    (permissions, roleId) => permissions | BigInt(reader.rolePermissions.get(roleId) ?? NONE),
    NONE,
  );

const canReadHistory = (reader: ReaderContext, overwrites: readonly Overwrite[]): boolean => {
  if (reader.userId === reader.ownerId) {
    return true;
  }
  const base = basePermissions(reader);
  if ((base & PermissionFlagsBits.Administrator) !== NONE) {
    return true;
  }
  const everyone = overwrites.find(({ id }) => id === reader.guildId);
  const afterEveryone = everyone
    ? applyOverwrite(base, BigInt(everyone.allow), BigInt(everyone.deny))
    : base;
  const roleOverwrites = overwrites.filter(
    ({ id, type }) => type === OverwriteType.Role && reader.memberRoleIds.includes(id),
  );
  const afterRoles = applyOverwrite(
    afterEveryone,
    roleOverwrites.reduce((allow, overwrite) => allow | BigInt(overwrite.allow), NONE),
    roleOverwrites.reduce((deny, overwrite) => deny | BigInt(overwrite.deny), NONE),
  );
  const member = overwrites.find(
    ({ id, type }) => type === OverwriteType.Member && id === reader.userId,
  );
  const effective = member
    ? applyOverwrite(afterRoles, BigInt(member.allow), BigInt(member.deny))
    : afterRoles;
  return (effective & READ_HISTORY) === READ_HISTORY;
};

export { canReadHistory };
export type { ReaderContext };
