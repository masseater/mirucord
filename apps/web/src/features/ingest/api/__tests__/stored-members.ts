import { runInDurableObject } from "cloudflare:test";
import { Array, DateTime, Effect, pipe, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { createGuildKey } from "#/shared/crypto/index.server";
import { db, guild, ingestConsent } from "#/shared/db/index.server";

const OWNER = "901";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

const StoredRowSchema = Schema.Struct({
  userId: Schema.String,
  roles: Schema.fromJsonString(Schema.Array(Schema.String)),
  joinedAt: Schema.NullOr(Schema.Finite),
  leftAt: Schema.NullOr(Schema.Finite),
});

type StoredRow = typeof StoredRowSchema.Type;

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(StoredRowSchema));

const SELECT_MEMBERS = "SELECT userId, roles, joinedAt, leftAt FROM member";

type SeededGuild = Readonly<{ id: string; noticeChannelId: string | null }>;

const seedMemberGuild = ({ id, noticeChannelId }: SeededGuild): Effect.Effect<void> =>
  Effect.gen(function* seed() {
    const wrappedKey = yield* createGuildKey;
    yield* Effect.promise(() =>
      db.insert(guild).values({ id, name: id, ownerId: OWNER, wrappedKey, joinedAt: SEEDED_AT }),
    );
    if (noticeChannelId !== null) {
      yield* Effect.promise(() =>
        db
          .insert(ingestConsent)
          .values({ guildId: id, grantedBy: OWNER, grantedAt: SEEDED_AT, noticeChannelId }),
      );
    }
  });

const storedMembers = ({
  guildId,
  includeLeft,
}: Readonly<{ guildId: string; includeLeft: boolean }>): Effect.Effect<readonly StoredRow[]> =>
  Effect.promise(() =>
    runInDurableObject(guildStore(guildId), (_store, state) =>
      state.storage.sql.exec(SELECT_MEMBERS).toArray(),
    ),
  ).pipe(
    Effect.flatMap(decodeRows),
    Effect.orDie,
    Effect.map((rows) =>
      pipe(
        rows,
        Array.filter(({ leftAt }) => includeLeft || leftAt === null),
      ),
    ),
  );

export { seedMemberGuild, storedMembers };
export type { SeededGuild, StoredRow };
