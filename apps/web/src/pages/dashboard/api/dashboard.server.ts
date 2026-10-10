import { getRequest } from "@tanstack/react-start/server";
import { Cause, Effect, Option } from "effect";

import {
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
  GuildRefreshResult,
  GuildSettings,
  ManagedGuild,
  PurgeResult,
  RefreshResult,
  RevokeResult,
} from "#/features/ingest/index.server";
import { signedInDiscordUser } from "#/shared/auth/index.server";
import { botInviteUrl } from "#/shared/discord/index.server";

type SignedOut = Readonly<{ status: "signedOut" }>;

type Dashboard =
  | SignedOut
  | Readonly<{ status: "ready"; guilds: readonly ManagedGuild[]; inviteUrl: string }>;

type GuildPage =
  | SignedOut
  | Readonly<{ status: "notManaged" }>
  | Readonly<{ status: "ready"; settings: GuildSettings }>;

type ConsentInput = Readonly<{
  guildId: string;
  noticeChannelId: string;
}>;

const SIGNED_OUT: SignedOut = { status: "signedOut" };

const withSignedInUser = <Value, Failure>(
  use: (userId: string) => Effect.Effect<Value, Failure>,
): Effect.Effect<Value | SignedOut, Failure> =>
  Effect.sync(getRequest).pipe(
    Effect.flatMap(signedInDiscordUser),
    Effect.flatMap((userId): Effect.Effect<Value | SignedOut, Failure> =>
      Option.match(userId, {
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

const loadDashboard: Effect.Effect<Dashboard> = withSignedInUser((userId) =>
  listManagedGuilds(userId).pipe(
    Effect.map((guilds): Dashboard => ({ status: "ready", guilds, inviteUrl: botInviteUrl() })),
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

const purgeFor = (
  input: Readonly<{ guildId: string; channelId: string }>,
): Effect.Effect<PurgeResult | SignedOut> =>
  withSignedInUser((userId) => purgePausedChannel({ ...input, userId }).pipe(Effect.orDie));

const refreshGuilds: Effect.Effect<RefreshResult | SignedOut> = withSignedInUser(() =>
  refreshGuildList.pipe(Effect.orDie),
);

const refreshGuild = (guildId: string): Effect.Effect<GuildRefreshResult | SignedOut> =>
  withSignedInUser((userId) => refreshManagedGuild({ guildId, userId }).pipe(Effect.orDie));

export {
  consentTo,
  loadDashboard,
  loadGuildPage,
  purgeFor,
  refreshGuild,
  refreshGuilds,
  revokeFor,
};
export type { ConsentInput, Dashboard, GuildPage, SignedOut };
