import { count, eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import { db, ingestConsent, message } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { managedGuild } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";
import { loadChannels } from "./settings-channels.server";
import type { SettingsCategory, SettingsChannel } from "./settings-channels.server";

const NO_MESSAGES = 0;

type Consent =
  | Readonly<{ status: "awaiting" }>
  | Readonly<{
      status: "granted";
      grantedBy: string;
      grantedAt: number;
      noticeChannelId: string;
    }>;

type ConsentedChannels = Readonly<{
  categories: readonly SettingsCategory[];
  channels: readonly SettingsChannel[];
  consent: Consent;
}>;

type GuildSettings = Readonly<{
  id: string;
  name: string;
  categories: readonly SettingsCategory[];
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

const loadConsentedChannels = (guildId: string): Effect.Effect<ConsentedChannels> =>
  loadConsent(guildId).pipe(
    Effect.flatMap((consent) =>
      loadChannels({ guildId, scope: consent }).pipe(
        Effect.map((listed) => ({ ...listed, consent })),
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
          Effect.all({
            consented: loadConsentedChannels(membership.guildId),
            storedMessages: countMessages(membership.guildId),
          }).pipe(
            Effect.map(({ consented, storedMessages }) =>
              Option.some({ ...consented, storedMessages, id: membership.guildId, name }),
            ),
          ),
      }),
    ),
  );

export { guildSettings, loadConsentedChannels };
export type { Consent, ConsentedChannels, GuildSettings };
export type { SettingsCategory, SettingsChannel } from "./settings-channels.server";
