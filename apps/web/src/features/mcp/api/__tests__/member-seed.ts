import { runInDurableObject } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { Effect, Option, pipe, Record, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { sealMember } from "#/shared/crypto/index.server";
import { db, role } from "#/shared/db/index.server";

import { guildKeys } from "./scenario";

type SeedMember = Readonly<{
  userId: string;
  username: string;
  nick: string | null;
  roles: readonly string[];
  joinedAt: number | null;
  leftAt: number | null;
}>;

type MemberSeed = Readonly<{
  guildId: string;
  members: readonly SeedMember[];
  roleNames: Readonly<Record<string, string>>;
  updatedAt: number;
}>;

const NO_GLOBAL_NAME = Option.getOrNull(Option.none<string>());
const NOT_BOT = 0;
const encodeRoles = Schema.encodeEffect(Schema.fromJsonString(Schema.Array(Schema.String)));
const INSERT_MEMBER =
  "INSERT INTO member (userId, sealed, roles, bot, joinedAt, leftAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)";

const seedMembers = ({ guildId, members, roleNames, updatedAt }: MemberSeed): Effect.Effect<void> =>
  Effect.gen(function* seed() {
    const { key } = yield* guildKeys(guildId);
    const sealRow = ({
      username,
      nick,
      ...member
    }: SeedMember): Effect.Effect<readonly (string | number | null)[]> =>
      Effect.all([
        sealMember({ username, globalName: NO_GLOBAL_NAME, nick }, key, {
          guildId,
          userId: member.userId,
        }),
        encodeRoles(member.roles).pipe(Effect.orDie),
      ]).pipe(
        Effect.map(([sealed, roles]) => [
          member.userId,
          sealed,
          roles,
          NOT_BOT,
          member.joinedAt,
          member.leftAt,
          updatedAt,
        ]),
      );
    const rows = yield* pipe(members, Effect.forEach(sealRow));
    yield* Effect.promise(() =>
      runInDurableObject(guildStore(guildId), (_store, state) => {
        for (const row of rows) {
          state.storage.sql.exec(INSERT_MEMBER, ...row);
        }
      }),
    );
    for (const [id, name] of Record.toEntries(roleNames)) {
      yield* Effect.promise(() => db.update(role).set({ name }).where(eq(role.id, id)));
    }
  });

export { seedMembers };
export type { MemberSeed, SeedMember };
