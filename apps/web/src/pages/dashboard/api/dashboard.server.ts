import { getRequest } from "@tanstack/react-start/server";
import { Array, Cause, Effect, Option, pipe } from "effect";

import { readableGuilds } from "#/entities/scope/index.server";
import {
  eraseOwnMessages,
  forumPosts,
  grantConsent,
  guildSettings,
  listManagedGuilds,
  purgePausedChannel,
  revokeConsent,
} from "#/features/ingest-messages/index.server";
import type {
  ConsentResult,
  EraseResult,
  ForumPostsResult,
  GuildSettings,
  ManagedGuild,
  PurgeResult,
  RevokeResult,
} from "#/features/ingest-messages/index.server";
import { disconnectApp, listConnectedApps, signedInUser } from "#/shared/auth/index.server";
import type { ConnectedApp, SignedInUser } from "#/shared/auth/index.server";
import { botInviteUrl } from "#/shared/discord/index.server";

export type SignedOut = Readonly<{ status: "signedOut" }>;

export type ReadableGuild = Readonly<{
  id: string;
  name: string;
  icon: string | null;
}>;

export type GuildListing =
  | Readonly<{ status: "ready"; guilds: readonly ReadableGuild[] }>
  | Readonly<{ status: "unavailable" }>;

export type Dashboard =
  | SignedOut
  | Readonly<{
      status: "ready";
      name: string;
      guilds: readonly ManagedGuild[];
      inviteUrl: string;
      readable: GuildListing;
      apps: readonly ConnectedApp[];
    }>;

export type DisconnectResult = SignedOut | Readonly<{ status: "disconnected" }>;

export type GuildPage =
  | SignedOut
  | Readonly<{ status: "notManaged" }>
  | Readonly<{ status: "ready"; settings: GuildSettings }>;

export type ConsentInput = Readonly<{
  guildId: string;
  noticeChannelId: string;
}>;

export type ChannelTarget = Readonly<{ guildId: string; channelId: string }>;

const SIGNED_OUT: SignedOut = { status: "signedOut" };

export const withSignedInAccount = <Value, Failure>(
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

const listReadable = (discordUserId: string): Effect.Effect<GuildListing> =>
  readableGuilds(discordUserId).pipe(
    Effect.map((guilds): GuildListing => ({
      status: "ready",
      guilds: pipe(
        guilds,
        Array.filter(({ consent }) => consent === "consented"),
        Array.map(({ guildId, name, icon }) => ({ id: guildId, name, icon })),
      ),
    })),
    Effect.catchTag("DiscordRequestError", () =>
      Effect.logWarning("Could not list readable servers").pipe(
        Effect.as<GuildListing>({ status: "unavailable" }),
      ),
    ),
  );

export const loadDashboard: Effect.Effect<Dashboard> = withSignedInAccount((user) =>
  Effect.all(
    {
      guilds: listManagedGuilds(user.discordUserId),
      readable: listReadable(user.discordUserId),
      apps: listConnectedApps(user.userId),
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map((parts): Dashboard => ({
      status: "ready",
      name: user.name,
      inviteUrl: botInviteUrl(),
      ...parts,
    })),
  ),
);

export const disconnectFor = (clientId: string): Effect.Effect<DisconnectResult> =>
  withSignedInAccount(({ userId }) =>
    disconnectApp({ userId, clientId }).pipe(
      Effect.as<DisconnectResult>({ status: "disconnected" }),
    ),
  );

export const eraseMessagesFor = (guildId: string): Effect.Effect<EraseResult | SignedOut> =>
  withSignedInUser((authorId) => eraseOwnMessages({ guildId, authorId }));

export const loadGuildPage = (guildId: string): Effect.Effect<GuildPage> =>
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

export const consentTo = (input: ConsentInput): Effect.Effect<ConsentResult | SignedOut> =>
  withSignedInUser((userId) => grantConsent({ ...input, userId }).pipe(Effect.orDie));

export const revokeFor = (guildId: string): Effect.Effect<RevokeResult | SignedOut> =>
  withSignedInUser((userId) => revokeConsent({ guildId, userId }).pipe(Effect.orDie));

export const purgeFor = (input: ChannelTarget): Effect.Effect<PurgeResult | SignedOut> =>
  withSignedInUser((userId) => purgePausedChannel({ ...input, userId }).pipe(Effect.orDie));

export const loadForumPosts = (input: ChannelTarget): Effect.Effect<ForumPostsResult | SignedOut> =>
  withSignedInUser((userId) => forumPosts({ ...input, userId }).pipe(Effect.orDie));

export type { EraseResult } from "#/features/ingest-messages/index.server";
