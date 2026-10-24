import { Array, Effect, Option, Order, pipe } from "effect";

import { TEXT_TYPES } from "#/features/ingest/model/channel-kind";
import { DASHBOARD_PATH, MASCOT_NAME, SITE_ORIGIN } from "#/shared/config";
import { findBotAdder, postChannelMessage, sendDirectMessage } from "#/shared/discord/index.server";
import type { DiscordChannel, DiscordGuild, OutgoingMessage } from "#/shared/discord/index.server";

import type { ChannelListing } from "./channel-listing.server";

type Welcome = Readonly<{
  botUserId: string;
  discordGuild: DiscordGuild;
  listing: ChannelListing;
}>;

type Addressee = "inviter" | "channel";

type Delivery = Addressee | "nowhere";

const CHANNEL_ATTEMPTS = 3;
const FIRST_POSITION = 0;

const GREETING = {
  inviter: (name: string) =>
    `はじめまして、${MASCOT_NAME}だよ！「${name}」に招待してくれてありがとう。`,
  channel: () => `はじめまして、${MASCOT_NAME}だよ！招待してくれてありがとう。`,
} as const;

const WAITING = `同意するまで、${MASCOT_NAME}はメッセージを読まないよ。`;
const CONSENT = "取り込みに同意する";
const HOW_TO = "使い方";

const welcomeMessage = (addressee: Addressee, discordGuild: DiscordGuild): OutgoingMessage => ({
  content: pipe([GREETING[addressee](discordGuild.name), WAITING], Array.join("\n")),
  links: [
    { label: CONSENT, url: `${SITE_ORIGIN}${DASHBOARD_PATH}/${discordGuild.id}` },
    { label: HOW_TO, url: `${SITE_ORIGIN}/#start` },
  ],
});

const byPosition: Order.Order<DiscordChannel> = Order.mapInput(
  Order.Number,
  ({ position }: DiscordChannel) =>
    Option.getOrElse(Option.fromUndefinedOr(position), () => FIRST_POSITION),
);

const welcomeChannels = ({ discordGuild, listing }: Welcome): readonly string[] => {
  const writable = pipe(
    listing.stored,
    Array.filter(({ id, type }) => TEXT_TYPES.has(type) && listing.readable.includes(id)),
  );
  const ordered = pipe(
    Array.sort(writable, byPosition),
    Array.map(({ id }) => id),
  );
  const system = Option.fromNullishOr(discordGuild.system_channel_id).pipe(
    Option.filter((id) => ordered.includes(id)),
    Option.toArray,
  );
  const others = pipe(
    ordered,
    Array.filter((id) => !system.includes(id)),
  );
  return Array.take([...system, ...others], CHANNEL_ATTEMPTS);
};

const inviterOf = ({ botUserId, discordGuild }: Welcome): Effect.Effect<string> =>
  findBotAdder({ guildId: discordGuild.id, botUserId }).pipe(
    Effect.catchTag("DiscordRequestError", () => Effect.succeedNone),
    Effect.map(Option.getOrElse(() => discordGuild.owner_id)),
  );

const postToChannels = (welcome: Welcome): Effect.Effect<Delivery> =>
  Effect.findFirst(welcomeChannels(welcome), (channelId) =>
    postChannelMessage({ channelId, ...welcomeMessage("channel", welcome.discordGuild) }).pipe(
      Effect.as(true),
      Effect.catchTag("DiscordRequestError", () => Effect.succeed(false)),
    ),
  ).pipe(
    Effect.map(
      Option.match({
        onNone: (): Delivery => "nowhere",
        onSome: (): Delivery => "channel",
      }),
    ),
  );

const welcomeGuild = (welcome: Welcome): Effect.Effect<void> =>
  inviterOf(welcome).pipe(
    Effect.flatMap((userId) =>
      sendDirectMessage({ userId, ...welcomeMessage("inviter", welcome.discordGuild) }),
    ),
    Effect.as<Delivery>("inviter"),
    Effect.catchTag("DiscordRequestError", () => postToChannels(welcome)),
    Effect.flatMap((sentTo) =>
      Effect.logInfo("Welcomed a joined server").pipe(Effect.annotateLogs({ sentTo })),
    ),
    Effect.annotateLogs({ guildId: welcome.discordGuild.id }),
  );

export { welcomeGuild };
export type { Welcome };
