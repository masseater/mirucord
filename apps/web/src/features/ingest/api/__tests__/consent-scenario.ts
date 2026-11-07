import { ChannelType } from "discord-api-types/v10";
import { Array, DateTime, Effect, pipe } from "effect";

import { createGuildKey } from "#/shared/crypto/index.server";
import { channel, db, guild, ingestConsent } from "#/shared/db/index.server";

const OWNER = "901";
const AWAITING = "400";
const GRANTED = "500";
const OTHER = "600";
const AWAITING_CHANNEL = "410";
const READABLE = "510";
const HIDDEN = "520";
const OTHER_CHANNEL = "610";
const CAUGHT_UP = "700";
const CAUGHT_UP_CHANNEL = "710";
const SEEDED_AT = DateTime.toDate(DateTime.makeUnsafe("2026-10-01T00:00:00Z"));

type ScenarioGuild = Readonly<{
  id: string;
  consented: boolean;
  channels: readonly Readonly<{
    id: string;
    botAccess: "readable" | "hidden";
    backfill?: "pending" | "done";
  }>[];
}>;

const GUILDS: readonly ScenarioGuild[] = [
  { id: AWAITING, consented: false, channels: [{ id: AWAITING_CHANNEL, botAccess: "readable" }] },
  {
    id: GRANTED,
    consented: true,
    channels: [
      { id: READABLE, botAccess: "readable" },
      { id: HIDDEN, botAccess: "hidden" },
    ],
  },
  { id: OTHER, consented: true, channels: [{ id: OTHER_CHANNEL, botAccess: "readable" }] },
  {
    id: CAUGHT_UP,
    consented: true,
    channels: [{ id: CAUGHT_UP_CHANNEL, botAccess: "readable", backfill: "done" }],
  },
];

const JOBS_OUTSIDE_SCOPE = [
  { guildId: AWAITING, channelId: AWAITING_CHANNEL },
  { guildId: GRANTED, channelId: HIDDEN },
  { guildId: GRANTED, channelId: OTHER_CHANNEL },
  { guildId: OTHER, channelId: READABLE },
];

const seedGuild = (seed: ScenarioGuild): Effect.Effect<void> =>
  Effect.gen(function* seedRows() {
    const wrappedKey = yield* createGuildKey;
    const channelRows = pipe(
      seed.channels,
      Array.map(({ id, botAccess, backfill }) => ({
        id,
        backfill,
        guildId: seed.id,
        name: `channel ${id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [],
        botAccess,
      })),
    );
    yield* Effect.promise(() =>
      db.batch([
        db.insert(guild).values({
          id: seed.id,
          name: `guild ${seed.id}`,
          ownerId: OWNER,
          wrappedKey,
          joinedAt: SEEDED_AT,
        }),
        db.insert(channel).values(channelRows),
      ]),
    );
  });

const seedConsents = (): Promise<unknown> =>
  db.insert(ingestConsent).values(
    pipe(
      GUILDS,
      Array.filter(({ consented }) => consented),
      Array.map(({ id }) => ({
        guildId: id,
        grantedBy: OWNER,
        grantedAt: SEEDED_AT,
        noticeChannelId: "0",
      })),
    ),
  );

const seedScenario = Effect.forEach(GUILDS, seedGuild, { discard: true }).pipe(
  Effect.andThen(Effect.promise(seedConsents)),
);

export {
  AWAITING,
  CAUGHT_UP,
  CAUGHT_UP_CHANNEL,
  GRANTED,
  JOBS_OUTSIDE_SCOPE,
  READABLE,
  seedScenario,
};
