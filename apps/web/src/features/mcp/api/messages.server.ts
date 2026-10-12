import { Array, DateTime, Effect, Option } from "effect";

import {
  containsQuery,
  guildStore,
  queryTokens,
  searchableTexts,
} from "#/entities/guild-message/index.server";
import type { CandidateMessage, SealedMessage } from "#/entities/guild-message/index.server";
import { openGuildKey, openMessage, openSearchKey } from "#/shared/crypto/index.server";
import type { MessageBody } from "#/shared/crypto/index.server";

import type { GuildScope } from "./scope.server";

type MessageView = Readonly<{
  id: string;
  channelId: string;
  author: string;
  content: string;
  attachments: MessageBody["attachments"];
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

const SEARCH_PAGES = 10;
const LAST_PAGE = 1;
const FIRST_HIT = 0;

type FindRequest = Readonly<{
  scope: GuildScope;
  query: string;
  channelIds: readonly string[];
  limit: number;
  before: Option.Option<number>;
}>;

type FoundMessages = Readonly<{ messages: readonly MessageView[]; next: Option.Option<number> }>;

type Hit = Readonly<{ seq: number; view: MessageView }>;

type Scan = Readonly<{ before: number | null; found: readonly Hit[]; pagesLeft: number }>;

const hitsOf = (
  request: FindRequest,
  candidates: readonly CandidateMessage[],
): Effect.Effect<readonly Hit[]> => {
  const seqOf = new Map(candidates.map(({ id, seq }) => [id, seq]));
  return openStored(request.scope, candidates).pipe(
    Effect.map((views) =>
      views
        .filter((view) => containsQuery({ texts: searchableTexts(view), query: request.query }))
        .flatMap((view) => {
          const hit = Option.fromUndefinedOr(seqOf.get(view.id)).pipe(
            Option.map((seq) => ({ seq, view })),
          );
          return Option.toArray(hit);
        }),
    ),
  );
};

const foundOf = (hits: readonly Hit[], next: Option.Option<number>): FoundMessages => ({
  messages: hits.map(({ view }) => view),
  next,
});

const scanPages = (
  request: FindRequest,
  tokens: readonly string[],
  { before, found, pagesLeft }: Scan,
): Effect.Effect<FoundMessages> =>
  Effect.promise(() =>
    guildStore(request.scope.guild.guildId).candidates(tokens, request.channelIds, {
      before,
      limit: request.limit,
    }),
  ).pipe(
    Effect.flatMap(({ messages, next }) =>
      hitsOf(request, messages).pipe(
        Effect.flatMap((hits) => {
          const collected = [...found, ...hits];
          if (collected.length >= request.limit) {
            const kept = collected.slice(FIRST_HIT, request.limit);
            const last = Option.map(Array.last(kept), ({ seq }) => seq);
            return Effect.succeed(foundOf(kept, last));
          }
          const remaining = Option.fromNullOr(next);
          if (Option.isNone(remaining) || pagesLeft <= LAST_PAGE) {
            return Effect.succeed(foundOf(collected, remaining));
          }
          return scanPages(request, tokens, {
            before: remaining.value,
            found: collected,
            pagesLeft: pagesLeft - LAST_PAGE,
          });
        }),
      ),
    ),
  );

const findMessages = (request: FindRequest): Effect.Effect<FoundMessages> =>
  openSearchKey(request.scope.guild.wrappedKey).pipe(
    Effect.flatMap((key) => queryTokens({ key, query: request.query })),
    Effect.flatMap((tokens) =>
      scanPages(request, tokens, {
        before: Option.getOrNull(request.before),
        found: [],
        pagesLeft: SEARCH_PAGES,
      }),
    ),
  );

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
