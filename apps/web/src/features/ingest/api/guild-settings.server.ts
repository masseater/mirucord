import { ChannelType } from "discord-api-types/v10";
import { count, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { isInScope } from "#/features/ingest/model/consent-scope";
import type { ConsentScope, ScopedChannel } from "#/features/ingest/model/consent-scope";
import { channel, db, ingestConsent, message } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { loadScope } from "./consent-scope.server";
import { managedGuild } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";

const NO_MESSAGES = 0;
const SELECTABLE_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
]);
const BACKFILL_INGEST = { pending: "backfilling", done: "done" } as const;

type ChannelIngest = "excluded" | "waiting" | "backfilling" | "done";

type SettingsChannel = Readonly<{ id: string; name: string; ingest: ChannelIngest }>;

type Consent =
  | Readonly<{ status: "awaiting" }>
  | Readonly<{
      status: "granted";
      grantedBy: string;
      grantedAt: number;
      channelIds: readonly string[];
      noticeChannelId: string;
    }>;

type GuildSettings = Readonly<{
  id: string;
  name: string;
  channels: readonly SettingsChannel[];
  consent: Consent;
  storedMessages: number;
}>;

const loadConsent = (guildId: string): Effect.Effect<Consent> =>
  Effect.promise(() =>
    db.select().from(ingestConsent).where(eq(ingestConsent.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.match(Array.head(rows), {
        onNone: (): Consent => ({ status: "awaiting" }),
        onSome: (row): Consent => ({
          status: "granted",
          grantedBy: row.grantedBy,
          grantedAt: row.grantedAt.getTime(),
          channelIds: row.channelIds,
          noticeChannelId: row.noticeChannelId,
        }),
      }),
    ),
  );

const ingestOf = (
  scope: ConsentScope,
  row: ScopedChannel & Readonly<{ newest: string | null; backfill: "pending" | "done" }>,
): ChannelIngest => {
  if (!isInScope(scope, row)) {
    return "excluded";
  }
  if (Option.isNone(Option.fromNullOr(row.newest))) {
    return "waiting";
  }
  return BACKFILL_INGEST[row.backfill];
};

const loadChannels = (
  guildId: string,
  scope: ConsentScope,
): Effect.Effect<readonly SettingsChannel[]> =>
  Effect.promise(() =>
    db
      .select({
        id: channel.id,
        name: channel.name,
        parentId: channel.parentId,
        type: channel.type,
        newest: channel.newestMessageId,
        backfill: channel.backfill,
      })
      .from(channel)
      .where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      rows
        .filter(({ type }) => SELECTABLE_TYPES.has(type))
        .map((row) => ({ id: row.id, name: row.name, ingest: ingestOf(scope, row) })),
    ),
  );

const countMessages = (guildId: string): Effect.Effect<number> =>
  Effect.promise(() =>
    db.select({ total: count() }).from(message).where(eq(message.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.getOrElse(
        Option.map(Array.head(rows), ({ total }) => total),
        () => NO_MESSAGES,
      ),
    ),
  );

const guildSettings = (
  membership: GuildMembership,
): Effect.Effect<Option.Option<GuildSettings>, DiscordRequestError> =>
  managedGuild(membership).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: ({ name }) =>
          loadScope(membership.guildId).pipe(
            Effect.flatMap((scope) =>
              Effect.all({
                channels: loadChannels(membership.guildId, scope),
                consent: loadConsent(membership.guildId),
                storedMessages: countMessages(membership.guildId),
              }),
            ),
            Effect.map((parts) => Option.some({ ...parts, id: membership.guildId, name })),
          ),
      }),
    ),
  );

export { guildSettings };
export type { ChannelIngest, Consent, GuildSettings, SettingsChannel };
