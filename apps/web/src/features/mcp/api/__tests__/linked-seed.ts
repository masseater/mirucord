import { env } from "cloudflare:workers";
import { Array, Effect, pipe } from "effect";

import { db, linkedAccount } from "#/shared/db/index.server";

type SeedLink = Readonly<{
  discordUserId: string;
  type: string;
  name: string;
  verified: boolean;
  publishedAt: number;
}>;

const INSERT_USER =
  "INSERT INTO user (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)";

const SEEDED_AT = 1;

const accountUserOf = (discordUserId: string): string => `user-${discordUserId}`;

const seedLinkedAccounts = (links: readonly SeedLink[]): Effect.Effect<void> => {
  const owners = pipe(
    links,
    Array.map(({ discordUserId }) => accountUserOf(discordUserId)),
    Array.dedupe,
    Array.map((id) =>
      env.DB.prepare(INSERT_USER).bind(id, id, `${id}@users.discord.invalid`, SEEDED_AT, SEEDED_AT),
    ),
  );
  const rows = pipe(
    links,
    Array.map(({ discordUserId, type, name, verified, publishedAt }) => ({
      userId: accountUserOf(discordUserId),
      discordUserId,
      type,
      name,
      verified,
      publishedAt,
    })),
  );
  return Effect.promise(() => env.DB.batch(owners)).pipe(
    Effect.andThen(Effect.promise(() => db.insert(linkedAccount).values(rows))),
    Effect.asVoid,
  );
};

export { seedLinkedAccounts };
export type { SeedLink };
