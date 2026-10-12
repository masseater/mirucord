import { DateTime, Effect, Option } from "effect";

import {
  containsQuery,
  guildStore,
  queryTokens,
  searchableTexts,
} from "#/entities/guild-message/index.server";
import type { SealedMessage } from "#/entities/guild-message/index.server";
import { openGuildKey, openMessage, openSearchKey } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

import type { GuildScope } from "./scope.server";

type MessageView = Readonly<{
  id: string;
  channelId: string;
  author: string;
  content: string;
  attachments: MessageBody["attachments"];
  embeds: MessageBody["embeds"];
  stickers: MessageBody["stickers"];
  poll: MessageBody["poll"];
  createdAt: string;
  edited: boolean;
  url: string;
}>;

const holdsMessage = (scope: GuildScope, { channelId }: SealedMessage): boolean =>
  scope.guild.consent === "consented" && scope.visible.includes(channelId);

const viewOf = (guildId: string, row: SealedMessage, body: MessageBody): MessageView => ({
  id: row.id,
  channelId: row.channelId,
  author: body.authorName,
  content: body.content,
  attachments: body.attachments,
  embeds: body.embeds,
  stickers: body.stickers,
  poll: body.poll,
  createdAt: DateTime.formatIso(DateTime.makeUnsafe(row.createdAt)),
  edited: Option.isSome(Option.fromNullOr(row.editedAt)),
  url: `https://discord.com/channels/${guildId}/${row.channelId}/${row.id}`,
});

const openStored = (
  scope: GuildScope,
  stored: readonly SealedMessage[],
): Effect.Effect<readonly MessageView[]> => {
  const { guildId, wrappedKey } = scope.guild;
  return openGuildKey(wrappedKey).pipe(
    Effect.flatMap((key) =>
      Effect.forEach(
        stored.filter((row) => holdsMessage(scope, row)),
        (row) =>
          openMessage(row.sealed, key, {
            guildId,
            channelId: row.channelId,
            messageId: row.id,
          }).pipe(Effect.map((body) => viewOf(guildId, row, body))),
      ),
    ),
  );
};

type FindRequest = Readonly<{
  scope: GuildScope;
  query: string;
  channelIds: readonly string[];
  limit: number;
  offset: number;
}>;

type FoundMessages = Readonly<{ total: number; messages: readonly MessageView[] }>;

const findMessages = (request: FindRequest): Effect.Effect<FoundMessages> => {
  const { guildId, wrappedKey } = request.scope.guild;
  return openSearchKey(wrappedKey).pipe(
    Effect.flatMap((key) => queryTokens({ key, query: request.query })),
    Effect.flatMap((tokens) =>
      Effect.promise(() => guildStore(guildId).candidates(tokens, request.channelIds)),
    ),
    Effect.flatMap((candidates) => openStored(request.scope, candidates)),
    Effect.map((views) =>
      views.filter((view) => containsQuery({ texts: searchableTexts(view), query: request.query })),
    ),
    Effect.map((found) => ({
      total: found.length,
      messages: found.slice(request.offset, request.offset + request.limit),
    })),
  );
};

type ReadRequest = Readonly<{
  scope: GuildScope;
  channelId: string;
  before: Option.Option<string>;
  limit: number;
}>;

const readMessages = (request: ReadRequest): Effect.Effect<readonly MessageView[]> =>
  Effect.promise(() =>
    guildStore(request.scope.guild.guildId).read(request.channelId, {
      before: Option.getOrNull(request.before),
      limit: request.limit,
    }),
  ).pipe(Effect.flatMap((stored) => openStored(request.scope, stored)));

export { findMessages, readMessages };
export type { FindRequest, FoundMessages, MessageView, ReadRequest };
