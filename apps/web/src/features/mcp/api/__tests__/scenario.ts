import { OverwriteTypes } from "@discordeno/types";
import { ChannelType, PermissionFlagsBits } from "discord-api-types/v10";
import { Array, DateTime, Effect, Option, Record } from "effect";
import { http, HttpResponse } from "msw";

import { guildStore, indexTokens } from "#/entities/guild-message/index.server";
import type { IndexedMessage } from "#/entities/guild-message/index.server";
import { createGuildKey, openGuildKeys, sealMessage } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent, role } from "#/shared/db/index.server";

const USER = "900";
const OWNER = "901";
const GUILD_A = "100";
const GUILD_B = "200";
const GUILD_C = "300";
const GUILD_D = "400";
const MEMBER_ROLE = "150";
const STAFF_ROLE = "160";
const A_OPEN = "110";
const A_STAFF = "120";
const A_CATEGORY = "130";
const A_STAFF_THREAD = "121";
const A_PRIVATE_THREAD = "111";
const B_OPEN = "210";
const C_OPEN = "310";
const D_OPEN = "410";
const A_OPEN_MESSAGE = "1100";
const SAME_WORDS = "来週のオフ会の集合場所";
const NOTHING = "0";
const NOT_FOUND = 404;
const VIEW = PermissionFlagsBits.ViewChannel.toString();
const READ = (PermissionFlagsBits.ViewChannel + PermissionFlagsBits.ReadMessageHistory).toString();
const SEEDED = DateTime.makeUnsafe("2026-10-01T00:00:00Z");
const SEEDED_AT = DateTime.toDate(SEEDED);

type Overwrite = (typeof channel.$inferInsert)["permissionOverwrites"][number];
type ScenarioChannel = Readonly<{
  id: string;
  type: ChannelType;
  parentId: Option.Option<string>;
  overwrites: readonly Overwrite[];
}>;
type ScenarioMessage = Readonly<{ id: string; channelId: string }>;
type ScenarioGuild = Readonly<{
  id: string;
  consent: "granted" | "withdrawing" | "notConsented";
  roles: Readonly<Record<string, string>>;
  channels: readonly ScenarioChannel[];
  messages: readonly ScenarioMessage[];
}>;

const STAFF_ONLY: readonly Overwrite[] = [
  { id: GUILD_A, type: OverwriteTypes.Role, allow: NOTHING, deny: VIEW },
  { id: STAFF_ROLE, type: OverwriteTypes.Role, allow: VIEW, deny: NOTHING },
];

const topLevel = (
  id: string,
  type: ChannelType,
  overwrites: readonly Overwrite[],
): ScenarioChannel => ({
  id,
  type,
  parentId: Option.none<string>(),
  overwrites,
});

const thread = (id: string, type: ChannelType, parentId: string): ScenarioChannel => ({
  id,
  type,
  parentId: Option.some(parentId),
  overwrites: [],
});

const openGuild = ({
  id,
  consent,
  channelId,
  messageId,
}: Readonly<{
  id: string;
  consent: ScenarioGuild["consent"];
  channelId: string;
  messageId: string;
}>): ScenarioGuild => ({
  id,
  consent,
  roles: { [id]: READ },
  channels: [topLevel(channelId, ChannelType.GuildText, [])],
  messages: [{ id: messageId, channelId }],
});

const GUILDS: readonly ScenarioGuild[] = [
  {
    id: GUILD_A,
    consent: "granted",
    roles: { [GUILD_A]: READ, [MEMBER_ROLE]: NOTHING, [STAFF_ROLE]: NOTHING },
    channels: [
      topLevel(A_OPEN, ChannelType.GuildText, []),
      topLevel(A_STAFF, ChannelType.GuildText, STAFF_ONLY),
      topLevel(A_CATEGORY, ChannelType.GuildCategory, []),
      thread(A_STAFF_THREAD, ChannelType.PublicThread, A_STAFF),
      thread(A_PRIVATE_THREAD, ChannelType.PrivateThread, A_OPEN),
    ],
    messages: [
      { id: A_OPEN_MESSAGE, channelId: A_OPEN },
      { id: "1200", channelId: A_STAFF },
      { id: "1210", channelId: A_STAFF_THREAD },
      { id: "1110", channelId: A_PRIVATE_THREAD },
    ],
  },
  openGuild({ id: GUILD_B, consent: "notConsented", channelId: B_OPEN, messageId: "2100" }),
  openGuild({ id: GUILD_C, consent: "granted", channelId: C_OPEN, messageId: "3100" }),
  openGuild({ id: GUILD_D, consent: "withdrawing", channelId: D_OPEN, messageId: "4100" }),
];

const ROLES_BY_MEMBERSHIP: Readonly<Record<string, readonly string[]>> = {
  [`${GUILD_A}/${USER}`]: [MEMBER_ROLE],
  [`${GUILD_B}/${USER}`]: [],
  [`${GUILD_D}/${USER}`]: [],
};

const discordMembers = http.get<Readonly<{ guildId: string; userId: string }>>(
  "https://discord.com/api/v10/guilds/:guildId/members/:userId",
  ({ params: { guildId, userId } }) =>
    Option.match(Record.get(ROLES_BY_MEMBERSHIP, `${guildId}/${userId}`), {
      onNone: () => HttpResponse.json({ message: "Unknown Member" }, { status: NOT_FOUND }),
      onSome: (roles) => HttpResponse.json({ roles }),
    }),
);

const sealedRows = (
  seed: ScenarioGuild,
  { key, searchKey }: Readonly<{ key: CryptoKey; searchKey: CryptoKey }>,
): Effect.Effect<readonly IndexedMessage[]> =>
  Effect.forEach(
    seed.messages,
    ({ id, channelId }) =>
      Effect.all({
        sealed: sealMessage({ authorName: "someone", content: SAME_WORDS, attachments: [] }, key, {
          guildId: seed.id,
          channelId,
          messageId: id,
        }),
        tokens: indexTokens({ key: searchKey, texts: [SAME_WORDS] }),
      }).pipe(
        Effect.map(({ sealed, tokens }) => ({
          row: {
            id,
            channelId,
            authorId: OWNER,
            sealed,
            createdAt: DateTime.toEpochMillis(SEEDED),
            editedAt: Option.getOrNull(Option.none<number>()),
            describedWith: Option.getOrNull(Option.none<string>()),
          },
          tokens,
        })),
      ),
    { concurrency: 1 },
  );

const ingestedProgress = (
  seed: ScenarioGuild,
  { id: channelId, type }: ScenarioChannel,
): Partial<typeof channel.$inferInsert> => {
  if (seed.consent === "notConsented" || type === ChannelType.GuildCategory) {
    return {};
  }
  const newest = Array.findFirst(seed.messages, (stored) => stored.channelId === channelId);
  return {
    newestMessageId: newest.pipe(
      Option.map(({ id }) => id),
      Option.getOrNull,
    ),
    backfill: "done",
  };
};

const seedConsent = ({ id, consent, channels }: ScenarioGuild): Effect.Effect<void> => {
  if (consent === "notConsented") {
    return Effect.void;
  }
  return Effect.promise(() =>
    db.insert(ingestConsent).values({
      guildId: id,
      state: consent,
      grantedBy: OWNER,
      grantedAt: SEEDED_AT,
      noticeChannelId: Array.head(channels).pipe(
        Option.map((first) => first.id),
        Option.getOrElse(() => id),
      ),
    }),
  ).pipe(Effect.asVoid);
};

const seedGuild = (seed: ScenarioGuild): Effect.Effect<void> =>
  Effect.gen(function* seedRows() {
    const wrappedKey = yield* createGuildKey;
    yield* Effect.promise(() =>
      db.insert(guild).values({
        id: seed.id,
        name: `guild ${seed.id}`,
        ownerId: OWNER,
        wrappedKey,
        joinedAt: SEEDED_AT,
      }),
    );
    yield* Effect.promise(() =>
      db.insert(role).values(
        Object.entries(seed.roles).map(([id, permissions]) => ({
          id,
          guildId: seed.id,
          permissions,
        })),
      ),
    );
    yield* Effect.promise(() =>
      db.insert(channel).values(
        seed.channels.map((seedChannel) => ({
          id: seedChannel.id,
          guildId: seed.id,
          name: `channel ${seedChannel.id}`,
          type: seedChannel.type,
          parentId: Option.getOrNull(seedChannel.parentId),
          permissionOverwrites: seedChannel.overwrites,
          ...ingestedProgress(seed, seedChannel),
        })),
      ),
    );
    yield* seedConsent(seed);
    const rows = yield* sealedRows(seed, yield* openGuildKeys(wrappedKey));
    yield* Effect.promise(() => guildStore(seed.id).write(rows, "overwrite"));
  });

const seedScenario = (): Promise<void> =>
  Effect.runPromise(Effect.forEach(GUILDS, seedGuild, { discard: true }));

export {
  A_OPEN,
  A_OPEN_MESSAGE,
  A_PRIVATE_THREAD,
  A_STAFF,
  A_STAFF_THREAD,
  B_OPEN,
  discordMembers,
  GUILD_A,
  GUILD_B,
  GUILD_C,
  GUILD_D,
  D_OPEN,
  SAME_WORDS,
  seedScenario,
  USER,
};
