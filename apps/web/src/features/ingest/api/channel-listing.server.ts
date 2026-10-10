import { Effect, Option, pipe } from "effect";

import { STORED_TYPES, THREAD_PARENT_TYPES } from "#/shared/discord";
import {
  FORBIDDEN,
  listActiveThreads,
  listArchivedThreads,
  listGuildChannels,
} from "#/shared/discord/index.server";
import type {
  DiscordChannel,
  DiscordGuild,
  DiscordRequestError,
} from "#/shared/discord/index.server";

import { botReader } from "./bot-readable.server";
import type { BotView } from "./bot-readable.server";

type ChannelListing = Readonly<{
  stored: readonly DiscordChannel[];
  readable: readonly string[];
  archived: readonly string[];
  unlisted: readonly string[];
}>;

type ChannelSync = ChannelListing & Readonly<{ discordGuild: DiscordGuild }>;

type ArchivedListing =
  | Readonly<{ status: "listed"; threads: readonly DiscordChannel[] }>
  | Readonly<{ status: "forbidden"; parentId: string }>;

const listArchived = (parentId: string): Effect.Effect<ArchivedListing, DiscordRequestError> =>
  listArchivedThreads(parentId).pipe(
    Effect.map((threads): ArchivedListing => ({ status: "listed", threads })),
    Effect.catchIf(
      ({ status }) => Option.contains(status, FORBIDDEN),
      () =>
        Effect.logWarning("Could not list archived threads").pipe(
          Effect.annotateLogs({ channelId: parentId }),
          Effect.as<ArchivedListing>({ status: "forbidden", parentId }),
        ),
    ),
  );

const archivedThreadsOf = (listings: readonly ArchivedListing[]): readonly DiscordChannel[] =>
  listings.flatMap((listing) => {
    if (listing.status === "listed") {
      return listing.threads;
    }
    return [];
  });

const unlistedParentsOf = (listings: readonly ArchivedListing[]): readonly string[] =>
  listings.flatMap((listing) => {
    if (listing.status === "forbidden") {
      return [listing.parentId];
    }
    return [];
  });

const idsOf = (channels: readonly DiscordChannel[]): readonly string[] =>
  channels.map(({ id }) => id);

const listChannelsOf = (view: BotView): Effect.Effect<ChannelListing, DiscordRequestError> =>
  Effect.gen(function* listChannels() {
    const [channels, active, readableIn] = yield* Effect.all([
      listGuildChannels(view.discordGuild.id),
      listActiveThreads(view.discordGuild.id),
      botReader(view),
    ]);
    const readableParents = readableIn(channels);
    const allParents = idsOf(channels.filter(({ type }) => THREAD_PARENT_TYPES.has(type)));
    const parents = allParents.filter((id) => readableParents.has(id));
    const hiddenParents = allParents.filter((id) => !readableParents.has(id));
    const listings = yield* pipe(parents, Effect.forEach(listArchived));
    const archived = archivedThreadsOf(listings);
    const everything = [...channels, ...active, ...archived];
    return {
      stored: everything.filter(({ type }) => STORED_TYPES.has(type)),
      readable: [...readableIn(everything)],
      archived: idsOf(archived),
      unlisted: [...hiddenParents, ...unlistedParentsOf(listings)],
    };
  });

export { listChannelsOf };
export type { ChannelListing, ChannelSync };
