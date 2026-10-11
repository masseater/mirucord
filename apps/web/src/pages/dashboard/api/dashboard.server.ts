import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { Boolean, Cause, Effect, Option } from "effect";

import {
  forumPosts,
  grantConsent,
  guildSettings,
  listManagedGuilds,
  purgePausedChannel,
  refreshGuildList,
  refreshManagedGuild,
  revokeConsent,
} from "#/features/ingest/index.server";
import type {
  ConsentResult,
  ForumPostsResult,
  GuildRefreshResult,
  GuildSettings,
  ManagedGuild,
  PurgeResult,
  RefreshResult,
  RevokeResult,
} from "#/features/ingest/index.server";
import { readableGuilds } from "#/features/mcp/index.server";
import { disconnectApp, listConnectedApps, signedInUser } from "#/shared/auth/index.server";
import type { ConnectedApp, SignedInUser } from "#/shared/auth/index.server";
import { db, ingestConsent } from "#/shared/db/index.server";
import { botInviteUrl } from "#/shared/discord/index.server";

type SignedOut = Readonly<{ status: "signedOut" }>;

type ReadableGuild = Readonly<{ id: string; name: string; consent: "awaiting" | "granted" }>;

type GuildListing =
  | Readonly<{ status: "ready"; guilds: readonly ReadableGuild[] }>
  | Readonly<{ status: "unavailable" }>;

type Dashboard =
  | SignedOut
  | Readonly<{
      status: "ready";
      name: string;
      guilds: readonly ManagedGuild[];
      inviteUrl: string;
      readable: GuildListing;
      apps: readonly ConnectedApp[];
    }>;

type DisconnectResult = SignedOut | Readonly<{ status: "disconnected" }>;

type GuildPage =
  | SignedOut
  | Readonly<{ status: "notManaged" }>
  | Readonly<{ status: "ready"; settings: GuildSettings }>;

type ConsentInput = Readonly<{
  guildId: string;
  noticeChannelId: string;
}>;

type ChannelTarget = Readonly<{ guildId: string; channelId: string }>;

const SIGNED_OUT: SignedOut = { status: "signedOut" };

const withSignedInAccount = <Value, Failure>(
  use: (user: SignedInUser) => Effect.Effect<Value, Failure>,
): Effect.Effect<Value | SignedOut, Failure> =>
  Effect.sync(getRequest).pipe(
    Effect.flatMap(signedInUser),
    Effect.flatMap((user): Effect.Effect<Value | SignedOut, Failure> =>
      Option.match(user, {
        onNone: () => Effect.succeed(SIGNED_OUT),
        onSome: use,
      }),
    ),
    Effect.tapCause((cause) =>
      Effect.logError("Dashboard request failed").pipe(
        Effect.annotateLogs({ cause: Cause.pretty(cause) }),
      ),
    ),
  );

const withSignedInUser = <Value, Failure>(
  use: (userId: string) => Effect.Effect<Value, Failure>,
): Effect.Effect<Value | SignedOut, Failure> =>
  withSignedInAccount(({ discordUserId }) => use(discordUserId));

const consentedGuildIds: Effect.Effect<readonly string[]> = Effect.promise(() =>
  db
    .select({ guildId: ingestConsent.guildId })
    .from(ingestConsent)
    .where(eq(ingestConsent.state, "granted")),
).pipe(Effect.map((rows) => rows.map(({ guildId }) => guildId)));

const consentOf = (consented: readonly string[], guildId: string): ReadableGuild["consent"] =>
  Boolean.match(consented.includes(guildId), {
    onFalse: () => "awaiting",
    onTrue: () => "granted",
  });

const listReadable = (discordUserId: string): Effect.Effect<GuildListing> =>
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

const loadDashboard: Effect.Effect<Dashboard> = withSignedInAccount((user) =>
  Effect.all({
    guilds: listManagedGuilds(user.discordUserId),
    readable: listReadable(user.discordUserId),
    apps: listConnectedApps(user.userId),
  }).pipe(
    Effect.map((parts): Dashboard => ({
      status: "ready",
      name: user.name,
      inviteUrl: botInviteUrl(),
      ...parts,
    })),
  ),
);

const disconnectFor = (clientId: string): Effect.Effect<DisconnectResult> =>
  withSignedInAccount(({ userId }) =>
    disconnectApp({ userId, clientId }).pipe(
      Effect.as<DisconnectResult>({ status: "disconnected" }),
    ),
  );

const loadGuildPage = (guildId: string): Effect.Effect<GuildPage> =>
  withSignedInUser((userId) =>
    guildSettings({ guildId, userId }).pipe(
      Effect.map(
        Option.match({
          onNone: (): GuildPage => ({ status: "notManaged" }),
          onSome: (settings): GuildPage => ({ status: "ready", settings }),
        }),
      ),
      Effect.orDie,
    ),
  );

const consentTo = (input: ConsentInput): Effect.Effect<ConsentResult | SignedOut> =>
  withSignedInUser((userId) => grantConsent({ ...input, userId }).pipe(Effect.orDie));

const revokeFor = (guildId: string): Effect.Effect<RevokeResult | SignedOut> =>
  withSignedInUser((userId) => revokeConsent({ guildId, userId }).pipe(Effect.orDie));

const purgeFor = (input: ChannelTarget): Effect.Effect<PurgeResult | SignedOut> =>
  withSignedInUser((userId) => purgePausedChannel({ ...input, userId }).pipe(Effect.orDie));

const loadForumPosts = (input: ChannelTarget): Effect.Effect<ForumPostsResult | SignedOut> =>
  withSignedInUser((userId) => forumPosts({ ...input, userId }).pipe(Effect.orDie));

const refreshGuilds: Effect.Effect<RefreshResult | SignedOut> = withSignedInUser(() =>
  refreshGuildList.pipe(Effect.orDie),
);

const refreshGuild = (guildId: string): Effect.Effect<GuildRefreshResult | SignedOut> =>
  withSignedInUser((userId) => refreshManagedGuild({ guildId, userId }).pipe(Effect.orDie));

export {
  consentTo,
  disconnectFor,
  loadDashboard,
  loadForumPosts,
  loadGuildPage,
  purgeFor,
  refreshGuild,
  refreshGuilds,
  revokeFor,
};
export type {
  ChannelTarget,
  ConsentInput,
  Dashboard,
  DisconnectResult,
  GuildListing,
  GuildPage,
  ReadableGuild,
  SignedOut,
};
