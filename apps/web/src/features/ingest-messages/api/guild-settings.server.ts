import { Array, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { ConsentDetail } from "#/entities/scope/index";
import { loadConsentDetail } from "#/entities/scope/index.server";
import { SCOPE_OF_CONSENT, guildIngestOf } from "#/features/ingest-messages/model/channel-ingest";
import type { GuildIngest } from "#/features/ingest-messages/model/channel-ingest";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { managedGuild } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";
import { loadChannels } from "./settings-channels.server";
import type { SettingsCategory, SettingsChannel } from "./settings-channels.server";

export type ConsentedChannels = Readonly<{
  categories: readonly SettingsCategory[];
  channels: readonly SettingsChannel[];
  consent: ConsentDetail;
}>;

export type GuildSettings = Readonly<{
  id: string;
  name: string;
  categories: readonly SettingsCategory[];
  channels: readonly SettingsChannel[];
  consent: ConsentDetail;
  ingest: GuildIngest;
  storedMessages: number;
}>;

const countMessages = (guildId: string): Effect.Effect<number> =>
  Effect.promise(() => guildStore(guildId).count());

export const loadConsentedChannels = (guildId: string): Effect.Effect<ConsentedChannels> =>
  loadConsentDetail(guildId).pipe(
    Effect.flatMap((consent) =>
      loadChannels({ guildId, scope: SCOPE_OF_CONSENT[consent.status] }).pipe(
        Effect.map((listed) => ({ ...listed, consent })),
      ),
    ),
  );

export const guildSettings = (
  membership: GuildMembership,
): Effect.Effect<Option.Option<GuildSettings>, DiscordRequestError> =>
  managedGuild(membership).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: ({ name }) =>
          Effect.all(
            {
              consented: loadConsentedChannels(membership.guildId),
              storedMessages: countMessages(membership.guildId),
            },
            { concurrency: "unbounded" },
          ).pipe(
            Effect.map(({ consented, storedMessages }) => {
              const channelIngest = pipe(
                consented.channels,
                Array.map(({ ingest }) => ingest),
              );
              return Option.some({
                ...consented,
                ingest: guildIngestOf(consented.consent.status, channelIngest),
                storedMessages,
                id: membership.guildId,
                name,
              });
            }),
          ),
      }),
    ),
  );

export type { SettingsCategory, SettingsChannel } from "./settings-channels.server";
