import { lte } from "drizzle-orm";
import { Array, Boolean, DateTime, Effect, Option } from "effect";

import { REFRESH_COOLDOWN } from "#/features/ingest/model/refresh-cooldown";
import { db, syncRun } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { managedGuild } from "./managed-guild.server";
import { syncGuildList, syncOneGuild } from "./sync-guilds.server";

const GUILD_LIST_SCOPE = "guilds";

type RefreshResult = Readonly<{ status: "refreshed" }> | Readonly<{ status: "coolingDown" }>;

type GuildRefreshResult = RefreshResult | Readonly<{ status: "notManaged" }>;

const REFRESHED: RefreshResult = { status: "refreshed" };
const COOLING_DOWN: RefreshResult = { status: "coolingDown" };

const claimRun = (scope: string): Effect.Effect<boolean> =>
  Effect.gen(function* claim() {
    const now = yield* DateTime.now;
    const cutoff = DateTime.toDate(DateTime.subtractDuration(now, REFRESH_COOLDOWN));
    const claimed = yield* Effect.promise(() =>
      db
        .insert(syncRun)
        .values({ scope, ranAt: DateTime.toDate(now) })
        .onConflictDoUpdate({
          target: syncRun.scope,
          set: { ranAt: DateTime.toDate(now) },
          setWhere: lte(syncRun.ranAt, cutoff),
        })
        .returning({ scope: syncRun.scope }),
    );
    return Array.isReadonlyArrayNonEmpty(claimed);
  });

const throttled = (
  scope: string,
  work: Effect.Effect<void, DiscordRequestError>,
): Effect.Effect<RefreshResult, DiscordRequestError> =>
  claimRun(scope).pipe(
    Effect.flatMap((claimed) =>
      Boolean.match(claimed, {
        onTrue: (): Effect.Effect<RefreshResult, DiscordRequestError> =>
          work.pipe(Effect.as(REFRESHED)),
        onFalse: () => Effect.succeed(COOLING_DOWN),
      }),
    ),
  );

const refreshGuildList: Effect.Effect<RefreshResult, DiscordRequestError> = throttled(
  GUILD_LIST_SCOPE,
  syncGuildList,
);

const refreshManagedGuild = (
  input: Readonly<{ guildId: string; userId: string }>,
): Effect.Effect<GuildRefreshResult, DiscordRequestError> =>
  managedGuild(input).pipe(
    Effect.flatMap(
      Option.match({
        onNone: (): Effect.Effect<GuildRefreshResult, DiscordRequestError> =>
          Effect.succeed({ status: "notManaged" }),
        onSome: () => throttled(`guild:${input.guildId}`, syncOneGuild(input.guildId)),
      }),
    ),
  );

export { refreshGuildList, refreshManagedGuild };
export type { GuildRefreshResult, RefreshResult };
