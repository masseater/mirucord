import { count, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { forumRowOf, ingestOf } from "#/features/ingest/model/channel-ingest";
import type { ChannelIngest, IngestRow } from "#/features/ingest/model/channel-ingest";
import { kindOf, THREAD_PARENT_TYPES } from "#/features/ingest/model/channel-kind";
import type { ConsentScope } from "#/features/ingest/model/consent-scope";
import { channel, db, ingestConsent, message } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { loadScope } from "./consent-scope.server";
import { managedGuild } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";

const NO_MESSAGES = 0;

type SettingsChannel =
  | Readonly<{ kind: "text"; id: string; name: string; ingest: ChannelIngest }>
  | Readonly<{ kind: "forum"; id: string; name: string; ingest: ChannelIngest; posts: number }>;

type StoredRow = IngestRow &
  Readonly<{ id: string; name: string; type: number; parentId: string | null }>;

type Consent =
  | Readonly<{ status: "awaiting" }>
  | Readonly<{
      status: "granted";
      grantedBy: string;
      grantedAt: number;
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
          noticeChannelId: row.noticeChannelId,
        }),
      }),
    ),
  );

const settingsChannelOf = (
  scope: ConsentScope,
  row: StoredRow,
  rows: readonly StoredRow[],
): SettingsChannel => {
  if (kindOf(row.type) === "text") {
    return { kind: "text", id: row.id, name: row.name, ingest: ingestOf(scope, row) };
  }
  const posts = rows.filter(({ parentId }) => parentId === row.id);
  return {
    kind: "forum",
    id: row.id,
    name: row.name,
    ingest: ingestOf(scope, forumRowOf(row, posts)),
    posts: posts.length,
  };
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
        type: channel.type,
        parentId: channel.parentId,
        newest: channel.newestMessageId,
        backfill: channel.backfill,
        botAccess: channel.botAccess,
      })
      .from(channel)
      .where(eq(channel.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      rows
        .filter(({ type }) => THREAD_PARENT_TYPES.has(type))
        .map((row) => settingsChannelOf(scope, row, rows)),
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
export type { Consent, GuildSettings, SettingsChannel };
