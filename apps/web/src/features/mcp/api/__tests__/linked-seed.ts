import { Array, Effect, pipe } from "effect";

import { user } from "#/shared/auth/index.server";
import { db, linkedAccount } from "#/shared/db/index.server";

type SeedLink = Readonly<{
  discordUserId: string;
  type: string;
  name: string;
  verified: boolean;
  publishedAt: number;
}>;

const accountUserOf = (discordUserId: string): string => `user-${discordUserId}`;

const seedLinkedAccounts = (links: readonly SeedLink[]): Effect.Effect<void> => {
  const owners = pipe(
    links,
    Array.map(({ discordUserId }) => accountUserOf(discordUserId)),
    Array.dedupe,
    Array.map((id) => ({ id, name: id, email: `${id}@users.discord.invalid` })),
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
  return Effect.promise(() => db.insert(user).values(owners)).pipe(
    Effect.andThen(Effect.promise(() => db.insert(linkedAccount).values(rows))),
    Effect.asVoid,
  );
};

export { seedLinkedAccounts };
export type { SeedLink };
