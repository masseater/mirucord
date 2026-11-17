import { Effect, Option } from "effect";

import { guildStore, openStored } from "#/entities/guild-message/index.server";
import type { MessageView } from "#/entities/guild-message/index.server";
import type { GuildScope } from "#/entities/scope/index.server";

export type ReadRequest = Readonly<{
  scope: GuildScope;
  channelId: string;
  before: Option.Option<string>;
  limit: number;
}>;

export const readMessages = (request: ReadRequest): Effect.Effect<readonly MessageView[]> =>
  Effect.promise(() =>
    guildStore(request.scope.guild.guildId).read(request.channelId, {
      before: Option.getOrNull(request.before),
      limit: request.limit,
    }),
  ).pipe(Effect.flatMap((stored) => openStored({ scope: request.scope, stored })));

export type AuthorReadRequest = Readonly<{
  scope: GuildScope;
  authorId: string;
  channelIds: readonly string[];
  before: Option.Option<string>;
  limit: number;
}>;

export const readAuthorMessages = (
  request: AuthorReadRequest,
): Effect.Effect<readonly MessageView[]> =>
  Effect.promise(() =>
    guildStore(request.scope.guild.guildId).readByAuthor({
      authorId: request.authorId,
      channelIds: request.channelIds,
      before: Option.getOrNull(request.before),
      limit: request.limit,
    }),
  ).pipe(Effect.flatMap((stored) => openStored({ scope: request.scope, stored })));
