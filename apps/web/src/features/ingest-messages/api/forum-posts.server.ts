import { and, eq } from "drizzle-orm";
import { Array, Effect, Order, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { ingestOf } from "#/features/ingest-messages/model/channel-ingest";
import type { ChannelIngest } from "#/features/ingest-messages/model/channel-ingest";
import { channel, db } from "#/shared/db/index.server";
import type { DiscordRequestError } from "#/shared/discord/index.server";

import { loadScope } from "./load-scope.server.ts";
import { whenManaged } from "./managed-guild.server.ts";
import type { GuildMembership } from "./managed-guild.server.ts";

const NO_MESSAGES = 0;

export type ForumPost = Readonly<{
  id: string;
  name: string;
  ingest: ChannelIngest;
  messages: number;
}>;

export type ForumPostsRequest = GuildMembership & Readonly<{ channelId: string }>;

export type ForumPostsResult =
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
    Effect.flatMap(({ scope, rows }) => {
      const channelIds = pipe(
        rows,
        Array.map(({ id }) => id),
      );
      return Effect.promise(() => guildStore(guildId).countByChannel(channelIds)).pipe(
        Effect.map((counts) => {
          const messagesOf = new Map(
            pipe(
              counts,
              Array.map((row) => [row.channelId, row.messages]),
            ),
          );
          return pipe(
            rows,
            Array.map((row): ForumPost => ({
              id: row.id,
              name: row.name,
              ingest: ingestOf(scope, row),
              messages: messagesOf.get(row.id) ?? NO_MESSAGES,
            })),
            (posts) => Array.sort(posts, NewestFirst),
          );
        }),
      );
    }),
  );

export const forumPosts = (
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
