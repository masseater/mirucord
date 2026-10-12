import { DateTime, Effect, Option } from "effect";

import { isNoticeCandidate } from "#/features/ingest/model/channel-ingest";
import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { MASCOT_NAME, MCP_URL, ONBOARDING_STEPS, PRIVACY_PATH, SITE_ORIGIN } from "#/shared/config";
import { db, ingestConsent } from "#/shared/db/index.server";
import { FORBIDDEN, NOT_FOUND, postChannelMessage } from "#/shared/discord/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { refreshIngest } from "./consent-scope.server";
import { loadConsentedChannels } from "./guild-settings.server";
import type { SettingsChannel } from "./guild-settings.server";
import { whenManaged } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";
import { requestWithdrawal } from "./withdraw-guild.server";

type ConsentRequest = Readonly<{
  guildId: string;
  userId: string;
  noticeChannelId: string;
}>;

type ConsentResult =
  | Readonly<{ status: "saved" }>
  | Readonly<{ status: "forbidden" }>
  | Readonly<{ status: "invalid" }>
  | Readonly<{ status: "withdrawing" }>
  | Readonly<{ status: "noticeForbidden" }>
  | Readonly<{ status: "noticeMissing" }>
  | Readonly<{ status: "noticeFailed" }>;

type RevokeResult = Readonly<{ status: "withdrawing" }> | Readonly<{ status: "forbidden" }>;

const NOTICE = [
  `はじめまして、${MASCOT_NAME}だよ！`,
  "このサーバーのみんなの思い出をさがせるように、過去ログを読ませてもらうね。",
  `読むのは **${MASCOT_NAME}が見られるチャンネル** だけだよ。`,
  `${ONBOARDING_STEPS.register.guide} → ${MCP_URL}`,
  ONBOARDING_STEPS.ask.guide,
  `${MASCOT_NAME}の使い方はここを見てね → ${SITE_ORIGIN}/#start`,
  `読んだ内容の扱いはここを見てね → ${SITE_ORIGIN}${PRIVACY_PATH}`,
].join("\n");

const isValidRequest = (request: ConsentRequest, channels: readonly SettingsChannel[]): boolean =>
  channels.some((channel) => isNoticeCandidate(channel) && channel.id === request.noticeChannelId);

type NoticePost = "posted" | "noticeForbidden" | "noticeMissing" | "noticeFailed";

const NOTICE_FAILURES: ReadonlyMap<number, NoticePost> = new Map([
  [FORBIDDEN, "noticeForbidden"],
  [NOT_FOUND, "noticeMissing"],
]);

const noticeFailureOf = (status: Option.Option<number>): NoticePost =>
  status.pipe(
    Option.flatMap((code) => Option.fromUndefinedOr(NOTICE_FAILURES.get(code))),
    Option.getOrElse((): NoticePost => "noticeFailed"),
  );

const postNoticeOnce = (
  request: ConsentRequest,
  scope: ConsentScope,
): Effect.Effect<NoticePost> => {
  if (scope.status === "granted") {
    return Effect.succeed("posted");
  }
  return postChannelMessage({
    channelId: request.noticeChannelId,
    content: NOTICE,
  }).pipe(
    Effect.as<NoticePost>("posted"),
    Effect.catchTag("DiscordRequestError", ({ status }) =>
      Effect.logWarning("Could not post the ingest notice").pipe(
        Effect.annotateLogs({
          guildId: request.guildId,
          status: Option.getOrElse(status, () => "network"),
        }),
        Effect.as(noticeFailureOf(status)),
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
  scope: ConsentScope,
  channels: readonly SettingsChannel[],
): Effect.Effect<ConsentResult> => {
  if (!isValidRequest(request, channels)) {
    return Effect.succeed({ status: "invalid" });
  }
  return postNoticeOnce(request, scope).pipe(
    Effect.flatMap((posted) => {
      if (posted !== "posted") {
        return Effect.succeed<ConsentResult>({ status: posted });
      }
      return saveConsent(request).pipe(
        Effect.andThen(refreshIngest(request.guildId)),
        Effect.as<ConsentResult>({ status: "saved" }),
      );
    }),
  );
};

const grantConsent = (request: ConsentRequest): Effect.Effect<ConsentResult, DiscordRequestError> =>
  whenManaged({
    membership: request,
    denied: { status: "forbidden" },
    use: () =>
      loadConsentedChannels(request.guildId).pipe(
        Effect.flatMap(({ consent, channels }) => {
          if (consent.status === "withdrawing") {
            return Effect.succeed<ConsentResult>({ status: "withdrawing" });
          }
          return applyConsent(request, consent, channels);
        }),
      ),
  });

const revokeConsent = (
  membership: GuildMembership,
): Effect.Effect<RevokeResult, DiscordRequestError> =>
  whenManaged({
    membership,
    denied: { status: "forbidden" },
    use: () =>
      requestWithdrawal(membership.guildId).pipe(Effect.as({ status: "withdrawing" } as const)),
  });

export { grantConsent, revokeConsent };
export type { ConsentRequest, ConsentResult, RevokeResult };
