import { Effect, Option } from "effect";

import { guildStore, openStored } from "#/entities/guild-message/index.server";
import type { MessageView, SealedMessage } from "#/entities/guild-message/index.server";
import type { GuildScope } from "#/entities/scope/index.server";

const openedFrom = (
  scope: GuildScope,
  load: () => Promise<readonly SealedMessage[]>,
): Effect.Effect<readonly MessageView[]> =>
  Effect.promise(load).pipe(Effect.flatMap((stored) => openStored({ scope, stored })));

export type ReadRequest = Readonly<{
  scope: GuildScope;
  channelId: string;
  before: Option.Option<string>;
  limit: number;
}>;

export const readMessages = (request: ReadRequest): Effect.Effect<readonly MessageView[]> =>
  openedFrom(request.scope, () =>
    guildStore(request.scope.guild.guildId).read(request.channelId, {
      before: Option.getOrNull(request.before),
      limit: request.limit,
    }),
  );

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
  openedFrom(request.scope, () =>
    guildStore(request.scope.guild.guildId).readByAuthor({
      authorId: request.authorId,
      channelIds: request.channelIds,
      before: Option.getOrNull(request.before),
      limit: request.limit,
    }),
  );
