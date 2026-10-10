import { BitField } from "@sapphire/bitfield";
import { OverwriteType, PermissionFlagsBits } from "discord-api-types/v10";
import { Array, Function, Option, Record } from "effect";

const DATA_FIRST_ARITY = 2;

type Overwrite = Readonly<{ id: string; type: OverwriteType; allow: string; deny: string }>;

type ReaderContext = Readonly<{
  guildId: string;
  ownerId: string;
  userId: string;
  memberRoleIds: readonly string[];
  rolePermissions: Readonly<Record<string, string>>;
}>;

const Permissions = new BitField(PermissionFlagsBits);
const READ_HISTORY = Permissions.union("ViewChannel", "ReadMessageHistory");
const MANAGE = Permissions.union("Administrator", "ManageGuild");

const applyOverwrite = (permissions: bigint, allow: bigint, deny: bigint): bigint =>
  Permissions.union(Permissions.difference(permissions, deny), allow);

const applyOne = (permissions: bigint, overwrite: Option.Option<Overwrite>): bigint =>
  Option.match(overwrite, {
    onNone: () => permissions,
    onSome: ({ allow, deny }) => applyOverwrite(permissions, BigInt(allow), BigInt(deny)),
  });

const basePermissions = (reader: ReaderContext): bigint =>
  Permissions.union(
    ...[reader.guildId, ...reader.memberRoleIds].map((roleId) =>
      Option.getOrElse(
        Option.map(Record.get(reader.rolePermissions, roleId), BigInt),
        () => Permissions.zero,
      ),
    ),
  );

const channelPermissions = (reader: ReaderContext, overwrites: readonly Overwrite[]): bigint => {
  const afterEveryone = applyOne(
    basePermissions(reader),
    Array.findFirst(overwrites, ({ id }) => id === reader.guildId),
  );
  const roleOverwrites = overwrites.filter(
    ({ id, type }) => type === OverwriteType.Role && reader.memberRoleIds.includes(id),
  );
  const afterRoles = applyOverwrite(
    afterEveryone,
    Permissions.union(...roleOverwrites.map(({ allow }) => BigInt(allow))),
    Permissions.union(...roleOverwrites.map(({ deny }) => BigInt(deny))),
  );
  return applyOne(
    afterRoles,
    Array.findFirst(
      overwrites,
      ({ id, type }) => type === OverwriteType.Member && id === reader.userId,
    ),
  );
};

const canReadHistoryDataFirst = (
  reader: ReaderContext,
  overwrites: readonly Overwrite[],
): boolean =>
  reader.userId === reader.ownerId ||
  Permissions.has(basePermissions(reader), "Administrator") ||
  Permissions.has(channelPermissions(reader, overwrites), READ_HISTORY);

const isGuildManager = (reader: ReaderContext): boolean =>
  reader.userId === reader.ownerId || Permissions.any(basePermissions(reader), MANAGE);

const canReadHistory: {
  (overwrites: readonly Overwrite[]): (reader: ReaderContext) => boolean;
  (reader: ReaderContext, overwrites: readonly Overwrite[]): boolean;
} = Function.dual(DATA_FIRST_ARITY, canReadHistoryDataFirst);

export { canReadHistory, isGuildManager };
export type { Overwrite, ReaderContext };
