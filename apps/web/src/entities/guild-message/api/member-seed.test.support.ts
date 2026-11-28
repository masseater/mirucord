import { runInDurableObject } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { Effect, Option, Record, Schema } from "effect";

import { sealMember } from "#/shared/crypto/index.server";
import { db, role } from "#/shared/db/index.server";

import { guildKeys } from "./scenario.test.support.ts";
import { guildStore } from "./store-stub.server.ts";

export type SeedMember = Readonly<{
  userId: string;
  username: string;
  nick: string | null;
  roles: readonly string[];
  joinedAt: number | null;
  leftAt: number | null;
}>;

export type MemberSeed = Readonly<{
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

export const seedMembers = ({
  guildId,
  members,
  roleNames,
  updatedAt,
}: MemberSeed): Effect.Effect<void> =>
  Effect.gen(function* seed() {
    const { key } = yield* guildKeys(guildId);
    const sealRow = ({
      username,
      nick,
      ...member
    }: SeedMember): Effect.Effect<readonly (string | number | null)[]> =>
      Effect.all(
        {
          sealed: sealMember({ username, globalName: NO_GLOBAL_NAME, nick }, key, {
            guildId,
            userId: member.userId,
          }),
          roles: encodeRoles(member.roles).pipe(Effect.orDie),
        },
        { concurrency: 1 },
      ).pipe(
        Effect.map(({ sealed, roles }) => [
          member.userId,
          sealed,
          roles,
          NOT_BOT,
          member.joinedAt,
          member.leftAt,
          updatedAt,
        ]),
      );
    const rows = yield* Effect.forEach(members, sealRow, { concurrency: 1 });
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
