import { ChannelType } from "discord-api-types/v10";
import { Array, Effect, Option, Order } from "effect";

import {
  DASHBOARD_PATH,
  MASCOT_NAME,
  MCP_URL,
  ONBOARDING_STEPS,
  SAMPLE_PROMPT,
  SITE_ORIGIN,
} from "#/shared/config";
import { findBotAdder, postChannelMessage, sendDirectMessage } from "#/shared/discord/index.server";
import type { DiscordChannel, DiscordGuild } from "#/shared/discord/index.server";

import type { ChannelListing } from "./channel-listing.server";

type Welcome = Readonly<{
  botUserId: string;
  discordGuild: DiscordGuild;
  listing: ChannelListing;
}>;

type Addressee = "inviter" | "channel";

type Delivery = Addressee | "nowhere";

const WELCOME_TYPES: ReadonlySet<number> = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
]);
const CHANNEL_ATTEMPTS = 3;
const FIRST_POSITION = 0;

const GREETING = {
  inviter: (name: string) =>
    `はじめまして、${MASCOT_NAME}だよ！「${name}」に招待してくれてありがとう。`,
  channel: () => `はじめまして、${MASCOT_NAME}だよ！招待してくれた管理者さん、ありがとう。`,
} as const;

const welcomeMessage = (addressee: Addressee, discordGuild: DiscordGuild): string =>
  [
    GREETING[addressee](discordGuild.name),
    `まだこのサーバーのメッセージは何も読んでないよ。使いはじめるには、次の 3 つをしてね。`,
    "",
    `**1. ${ONBOARDING_STEPS.consent}**`,
    `サーバーの管理者さんがログインして、取り込みに同意してね。同意するまで${MASCOT_NAME}は何も読まないよ。`,
    `<${SITE_ORIGIN}${DASHBOARD_PATH}/${discordGuild.id}>`,
    `**2. ${ONBOARDING_STEPS.register}**`,
    "Claude などの MCP に対応したアプリに、この URL をコネクタとして登録してね。サーバーのみんなも、それぞれ自分のアプリに登録すれば使えるよ。",
    `<${MCP_URL}>`,
    `**3. ${ONBOARDING_STEPS.ask}**`,
    `「${SAMPLE_PROMPT}」みたいに聞いてみてね。`,
    "",
    `くわしい使い方はここ → <${SITE_ORIGIN}/#start>`,
  ].join("\n");

const byPosition: Order.Order<DiscordChannel> = Order.mapInput(
  Order.Number,
  ({ position }: DiscordChannel) =>
    Option.getOrElse(Option.fromUndefinedOr(position), () => FIRST_POSITION),
);

const welcomeChannels = ({ discordGuild, listing }: Welcome): readonly string[] => {
  const writable = listing.stored.filter(
    ({ id, type }) => WELCOME_TYPES.has(type) && listing.readable.includes(id),
  );
  const ordered = Array.sort(writable, byPosition).map(({ id }) => id);
  const system = Option.fromNullishOr(discordGuild.system_channel_id).pipe(
    Option.filter((id) => ordered.includes(id)),
    Option.toArray,
  );
  const others = ordered.filter((id) => !system.includes(id));
  return Array.take([...system, ...others], CHANNEL_ATTEMPTS);
};

const inviterOf = ({ botUserId, discordGuild }: Welcome): Effect.Effect<string> =>
  findBotAdder({ guildId: discordGuild.id, botUserId }).pipe(
    Effect.catchTag("DiscordRequestError", () => Effect.succeedNone),
    Effect.map(Option.getOrElse(() => discordGuild.owner_id)),
  );

const postToChannels = (welcome: Welcome): Effect.Effect<Delivery> =>
  Effect.findFirst(welcomeChannels(welcome), (channelId) =>
    postChannelMessage({
      channelId,
      content: welcomeMessage("channel", welcome.discordGuild),
    }).pipe(
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
      sendDirectMessage({ userId, content: welcomeMessage("inviter", welcome.discordGuild) }),
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
