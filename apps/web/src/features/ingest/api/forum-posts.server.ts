import { and, eq } from "drizzle-orm";
import { Array, Effect, Order } from "effect";

import { ingestOf } from "#/features/ingest/model/channel-ingest";
import type { ChannelIngest } from "#/features/ingest/model/channel-ingest";
import { channel, db } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";
import { guildStore } from "#/shared/guild-store/index.server";

import { loadScope } from "./consent-scope.server";
import { whenManaged } from "./managed-guild.server";
import type { GuildMembership } from "./managed-guild.server";

const NO_MESSAGES = 0;

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
  Effect.all(
    {
      scope: loadScope(guildId),
      rows: Effect.promise(() =>
        db
          .select({
            id: channel.id,
            name: channel.name,
            newest: channel.newestMessageId,
            backfill: channel.backfill,
            botAccess: channel.botAccess,
          })
          .from(channel)
          .where(and(eq(channel.guildId, guildId), eq(channel.parentId, channelId))),
      ),
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.flatMap(({ scope, rows }) =>
      Effect.promise(() => guildStore(guildId).countByChannel(rows.map(({ id }) => id))).pipe(
        Effect.map((counts) => {
          const messagesOf = new Map(counts.map((row) => [row.channelId, row.messages]));
          return Array.sort(
            rows.map((row): ForumPost => ({
              id: row.id,
              name: row.name,
              ingest: ingestOf(scope, row),
              messages: messagesOf.get(row.id) ?? NO_MESSAGES,
            })),
            NewestFirst,
          );
        }),
      ),
    ),
  );

const forumPosts = (
  request: ForumPostsRequest,
): Effect.Effect<ForumPostsResult, DiscordRequestError> =>
  whenManaged({
    membership: request,
    denied: { status: "forbidden" },
    use: () =>
      loadForumPosts(request).pipe(
        Effect.map((posts): ForumPostsResult => ({ status: "ready", posts })),
      ),
  });

export { forumPosts };
export type { ForumPost, ForumPostsRequest, ForumPostsResult };
