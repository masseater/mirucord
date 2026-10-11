import { and, count, eq } from "drizzle-orm";
import { Array, Effect, Option, Order } from "effect";

import { ingestOf } from "#/features/ingest/model/channel-ingest";
import type { ChannelIngest } from "#/features/ingest/model/channel-ingest";
import { channel, db, message } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { loadScope } from "./consent-scope.server";
import { managedGuild } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";

type ForumPost = Readonly<{ id: string; name: string; ingest: ChannelIngest; messages: number }>;

type ForumPostsRequest = GuildMembership & Readonly<{ channelId: string }>;

type ForumPostsResult =
  | Readonly<{ status: "forbidden" }>
  | Readonly<{ status: "ready"; posts: readonly ForumPost[] }>;

const NewestFirst: Order.Order<ForumPost> = Order.flip(
  Order.mapInput(Order.BigInt, ({ id }: ForumPost) => BigInt(id)),
);

const loadForumPosts = ({
  guildId,
  channelId,
}: Omit<ForumPostsRequest, "userId">): Effect.Effect<readonly ForumPost[]> =>
  Effect.all({
    scope: loadScope(guildId),
    rows: Effect.promise(() =>
      db
        .select({
          id: channel.id,
          name: channel.name,
          newest: channel.newestMessageId,
          backfill: channel.backfill,
          botAccess: channel.botAccess,
          messages: count(message.id),
        })
        .from(channel)
        .leftJoin(message, eq(message.channelId, channel.id))
        .where(and(eq(channel.guildId, guildId), eq(channel.parentId, channelId)))
        .groupBy(channel.id),
    ),
  }).pipe(
    Effect.map(({ scope, rows }) =>
      Array.sort(
        rows.map((row): ForumPost => ({
          id: row.id,
          name: row.name,
          ingest: ingestOf(scope, row),
          messages: row.messages,
        })),
        NewestFirst,
      ),
    ),
  );

const forumPosts = (
  request: ForumPostsRequest,
): Effect.Effect<ForumPostsResult, DiscordRequestError> =>
  managedGuild(request).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeed<ForumPostsResult>({ status: "forbidden" }),
        onSome: () =>
          loadForumPosts(request).pipe(
            Effect.map((posts): ForumPostsResult => ({ status: "ready", posts })),
          ),
      }),
    ),
  );

export { forumPosts };
export type { ForumPost, ForumPostsRequest, ForumPostsResult };
