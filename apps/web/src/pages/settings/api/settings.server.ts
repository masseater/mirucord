import { getRequest } from "@tanstack/react-start/server";
import { Boolean, Cause, Effect, Option } from "effect";

import { readableGuilds } from "#/features/mcp/index.server";
import { disconnectApp, listConnectedApps, signedInUser } from "#/shared/auth/index.server";
import type { ConnectedApp, SignedInUser } from "#/shared/auth/index.server";
import { db, ingestConsent } from "#/shared/db/index.server";

type SignedOut = Readonly<{ status: "signedOut" }>;

type ReadableGuild = Readonly<{ id: string; name: string; consent: "awaiting" | "granted" }>;

type GuildListing =
  | Readonly<{ status: "ready"; guilds: readonly ReadableGuild[] }>
  | Readonly<{ status: "unavailable" }>;

type Settings =
  | SignedOut
  | Readonly<{
      status: "ready";
      name: string;
      guilds: GuildListing;
      apps: readonly ConnectedApp[];
    }>;

type DisconnectResult = SignedOut | Readonly<{ status: "disconnected" }>;

const SIGNED_OUT: SignedOut = { status: "signedOut" };

const withSignedInUser = <Value>(
  use: (user: SignedInUser) => Effect.Effect<Value>,
): Effect.Effect<Value | SignedOut> =>
  Effect.sync(getRequest).pipe(
    Effect.flatMap(signedInUser),
    Effect.flatMap((user): Effect.Effect<Value | SignedOut> =>
      Option.match(user, {
        onNone: () => Effect.succeed(SIGNED_OUT),
        onSome: use,
      }),
    ),
    Effect.tapCause((cause) =>
      Effect.logError("Settings request failed").pipe(
        Effect.annotateLogs({ cause: Cause.pretty(cause) }),
      ),
    ),
  );

const consentedGuildIds: Effect.Effect<readonly string[]> = Effect.promise(() =>
  db.select({ guildId: ingestConsent.guildId }).from(ingestConsent),
).pipe(Effect.map((rows) => rows.map(({ guildId }) => guildId)));

const consentOf = (consented: readonly string[], guildId: string): ReadableGuild["consent"] =>
  Boolean.match(consented.includes(guildId), {
    onFalse: () => "awaiting",
    onTrue: () => "granted",
  });

const listGuilds = (discordUserId: string): Effect.Effect<GuildListing> =>
  Effect.all({ guilds: readableGuilds(discordUserId), consented: consentedGuildIds }).pipe(
    Effect.map(({ guilds, consented }): GuildListing => ({
      status: "ready",
      guilds: guilds.map(({ guildId, name }) => ({
        id: guildId,
        name,
        consent: consentOf(consented, guildId),
      })),
    })),
    Effect.catchTag("DiscordRequestError", () =>
      Effect.logWarning("Could not list readable servers").pipe(
        Effect.as<GuildListing>({ status: "unavailable" }),
      ),
    ),
  );

const loadSettings: Effect.Effect<Settings> = withSignedInUser((user) =>
  Effect.all({
    guilds: listGuilds(user.discordUserId),
    apps: listConnectedApps(user.userId),
  }).pipe(
    Effect.map(({ guilds, apps }): Settings => ({
      status: "ready",
      name: user.name,
      guilds,
      apps,
    })),
  ),
);

const disconnectFor = (clientId: string): Effect.Effect<DisconnectResult> =>
  withSignedInUser(({ userId }) =>
    disconnectApp({ userId, clientId }).pipe(
      Effect.as<DisconnectResult>({ status: "disconnected" }),
    ),
  );

export { disconnectFor, loadSettings };
export type { DisconnectResult, GuildListing, ReadableGuild, Settings };
