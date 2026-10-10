import { eq } from "drizzle-orm";
import { DateTime, Effect, Option } from "effect";

import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { PRIVACY_PATH, SITE_ORIGIN } from "#/shared/config";
import { db, ingestConsent } from "#/shared/db/index.server";
import { postChannelMessage } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { loadScope, refreshIngest } from "./consent-scope.server";
import { guildSettings } from "./guild-settings.server";
import type { SettingsChannel } from "./guild-settings.server";
import { managedGuild } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";

type ConsentRequest = Readonly<{
  guildId: string;
  userId: string;
  noticeChannelId: string;
}>;

type ConsentResult =
  | Readonly<{ status: "saved" }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{ status: "invalid" }>
  | Readonly<{ status: "noticeFailed" }>;

type RevokeResult = Readonly<{ status: "revoked" }> | Readonly<{ status: "forbidden" }>;

const NOTICE = [
  "このサーバーの過去ログを mirucord が読み取ります。",
  "対象は mirucord の Bot が見られるチャンネルです。範囲は Discord のチャンネル権限で変えられます。",
  `取り扱いについて: ${SITE_ORIGIN}${PRIVACY_PATH}`,
].join("\n");

const isValidRequest = (request: ConsentRequest, channels: readonly SettingsChannel[]): boolean =>
  channels.some(({ id, ingest }) => id === request.noticeChannelId && ingest !== "unreadable");

const postNoticeOnce = (request: ConsentRequest, scope: ConsentScope): Effect.Effect<boolean> => {
  if (scope.status === "granted") {
    return Effect.succeed(true);
  }
  return postChannelMessage({
    channelId: request.noticeChannelId,
    content: NOTICE,
  }).pipe(
    Effect.as(true),
    Effect.catchTag("DiscordRequestError", ({ status }) =>
      Effect.logWarning("Could not post the ingest notice").pipe(
        Effect.annotateLogs({
          guildId: request.guildId,
          status: Option.getOrElse(status, () => "network"),
        }),
        Effect.as(false),
      ),
    ),
  );
};

const saveConsent = (request: ConsentRequest): Effect.Effect<void> =>
  DateTime.now.pipe(
    Effect.flatMap((now) => {
      const values = {
        grantedBy: request.userId,
        grantedAt: DateTime.toDate(now),
        noticeChannelId: request.noticeChannelId,
      };
      return Effect.promise(() =>
        db
          .insert(ingestConsent)
          .values({ ...values, guildId: request.guildId })
          .onConflictDoUpdate({ target: ingestConsent.guildId, set: values }),
      );
    }),
    Effect.asVoid,
  );

const applyConsent = (
  request: ConsentRequest,
  channels: readonly SettingsChannel[],
): Effect.Effect<ConsentResult> => {
  if (!isValidRequest(request, channels)) {
    return Effect.succeed({ status: "invalid" });
  }
  return loadScope(request.guildId).pipe(
    Effect.flatMap((scope) => postNoticeOnce(request, scope)),
    Effect.flatMap((posted) => {
      if (!posted) {
        return Effect.succeed<ConsentResult>({ status: "noticeFailed" });
      }
      return saveConsent(request).pipe(
        Effect.andThen(refreshIngest(request.guildId)),
        Effect.as<ConsentResult>({ status: "saved" }),
      );
    }),
  );
};

const grantConsent = (request: ConsentRequest): Effect.Effect<ConsentResult, DiscordRequestError> =>
  guildSettings(request).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed<ConsentResult>({ status: "forbidden" }),
        onSome: ({ channels }) => applyConsent(request, channels),
      }),
    ),
  );

const revokeConsent = (
  membership: GuildMembership,
): Effect.Effect<RevokeResult, DiscordRequestError> =>
  managedGuild(membership).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed<RevokeResult>({ status: "forbidden" }),
        onSome: () =>
          Effect.promise(() =>
            db.delete(ingestConsent).where(eq(ingestConsent.guildId, membership.guildId)),
          ).pipe(
            Effect.andThen(refreshIngest(membership.guildId)),
            Effect.as<RevokeResult>({ status: "revoked" }),
          ),
      }),
    ),
  );

export { grantConsent, revokeConsent };
export type { ConsentRequest, ConsentResult, RevokeResult };
