import { DateTime, Effect, Option } from "effect";

import { guildStore, queryTokens, searchMessages } from "#/entities/guild-message/index.server";
import type { IndexedMessage, StoredRow } from "#/entities/guild-message/index.server";
import { createGuildKey } from "#/shared/crypto/index.server";
import { db, guild, ingestConsent } from "#/shared/db/index.server";

const OWNER = "901";
const SEEDED = DateTime.makeUnsafe("2026-10-01T00:00:00Z");
const SEEDED_AT = DateTime.toEpochMillis(SEEDED);
const READ_LIMIT = 200;
const SEARCH_LIMIT = 200;
const UNBOUNDED = Option.getOrNull(Option.none<number>());
const NEWEST = Option.getOrNull(Option.none<string>());

type GuildChannel = Readonly<{ guildId: string; channelId: string }>;

const storedMessage = (
  row: Pick<StoredRow, "id" | "channelId"> & Partial<StoredRow>,
): IndexedMessage => ({
  row: {
    authorId: OWNER,
    sealed: "sealed",
    createdAt: SEEDED_AT,
    editedAt: Option.getOrNull(Option.none<number>()),
    describedWith: Option.getOrNull(Option.none<string>()),
    ...row,
  },
  tokens: [],
});

const putMessages = ({
  guildId,
  messages,
}: Readonly<{ guildId: string; messages: readonly IndexedMessage[] }>): Effect.Effect<void> =>
  Effect.promise(() => guildStore(guildId).write(messages, "overwrite"));

const storedIdsIn = ({ guildId, channelId }: GuildChannel): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    guildStore(guildId).idsBetween(channelId, { from: UNBOUNDED, upTo: UNBOUNDED }),
  );

const sealedIn = ({ guildId, channelId }: GuildChannel): Effect.Effect<readonly string[]> =>
  Effect.promise(() =>
    guildStore(guildId).read(channelId, { before: NEWEST, limit: READ_LIMIT }),
  ).pipe(Effect.map((rows) => rows.map(({ sealed }) => sealed)));

const describedWithOf = ({
  guildId,
  id,
}: Readonly<{ guildId: string; id: string }>): Effect.Effect<readonly (string | null)[]> =>
  Effect.promise(() => guildStore(guildId).stored([id])).pipe(
    Effect.map((rows) => rows.map(({ describedWith }) => describedWith)),
  );

const candidateIds = ({
  guildId,
  channelId,
  searchKey,
  query,
}: GuildChannel & Readonly<{ searchKey: CryptoKey; query: string }>): Effect.Effect<
  readonly string[]
> =>
  Effect.promise(() => guildStore(guildId).publish()).pipe(
    Effect.andThen(queryTokens({ key: searchKey, query })),
    Effect.flatMap((tokens) =>
      searchMessages({ guildId, tokens, channelIds: [channelId], offset: 0, limit: SEARCH_LIMIT }),
    ),
    Effect.map(({ entries }) => entries.map(({ id }) => id)),
  );

const consentedGuild = ({ guildId, channelId }: GuildChannel): Effect.Effect<void> =>
  createGuildKey.pipe(
    Effect.flatMap((wrappedKey) =>
      Effect.promise(() =>
        db.batch([
          db.insert(guild).values({
            id: guildId,
            name: "guild",
            ownerId: OWNER,
            wrappedKey,
            joinedAt: DateTime.toDate(SEEDED),
          }),
          db.insert(ingestConsent).values({
            guildId,
            grantedBy: OWNER,
            grantedAt: DateTime.toDate(SEEDED),
            noticeChannelId: channelId,
          }),
        ]),
      ),
    ),
    Effect.asVoid,
  );

const storedCount = (guildId: string): Effect.Effect<number> =>
  Effect.promise(() => guildStore(guildId).count());

export {
  candidateIds,
  consentedGuild,
  describedWithOf,
  putMessages,
  sealedIn,
  storedCount,
  storedIdsIn,
  storedMessage,
};
export type { GuildChannel };
