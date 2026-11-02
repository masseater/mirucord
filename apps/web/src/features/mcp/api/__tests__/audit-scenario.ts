import { runInDurableObject } from "cloudflare:test";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { eq } from "drizzle-orm";
import { Effect, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { sealAudit } from "#/shared/crypto/index.server";
import { db, role } from "#/shared/db/index.server";

import { GUILD_A, guildKeys, MEMBER_ROLE, seedScenario } from "./scenario";

type SeededAuditEntry = Readonly<{
  id: string;
  actionType: number;
  userId: string;
  targetId: string;
  at: number;
  detail: string;
}>;

const INSERT_ENTRY =
  "INSERT INTO audit_entry (id, actionType, userId, targetId, at, sealed) VALUES (?, ?, ?, ?, ?, ?)";

const sealedRowOf =
  (key: CryptoKey) =>
  ({ detail, ...entry }: SeededAuditEntry): Effect.Effect<readonly (string | number)[]> =>
    sealAudit({ key, address: { guildId: GUILD_A, entryId: entry.id } })(detail).pipe(
      Effect.map((sealed) => [
        entry.id,
        entry.actionType,
        entry.userId,
        entry.targetId,
        entry.at,
        sealed,
      ]),
    );

const seedAuditScenario = (entries: readonly SeededAuditEntry[]): Promise<void> =>
  Effect.runPromise(
    Effect.gen(function* seedAudit() {
      yield* Effect.promise(seedScenario);
      const { key } = yield* guildKeys(GUILD_A);
      const rows = yield* pipe(entries, Effect.forEach(sealedRowOf(key)));
      yield* Effect.promise(() =>
        runInDurableObject(guildStore(GUILD_A), (_store, state) => {
          for (const row of rows) {
            state.storage.sql.exec(INSERT_ENTRY, ...row);
          }
        }),
      );
    }),
  );

const grantAuditLog = (): Promise<unknown> =>
  db
    .update(role)
    .set({ permissions: PermissionFlagsBits.ViewAuditLog.toString() })
    .where(eq(role.id, MEMBER_ROLE));

export { grantAuditLog, seedAuditScenario };
export type { SeededAuditEntry };
