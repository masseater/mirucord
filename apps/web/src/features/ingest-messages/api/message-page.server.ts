import { Array, Effect, Option, Order, pipe } from "effect";

import { listMessages, PAGE_SIZE } from "#/shared/discord/index.server";
import type {
  DiscordMessage,
  DiscordRequestError,
  MessagePage,
} from "#/shared/discord/index.server";

import { loadScope } from "./consent-scope.server";
import { storeMessages } from "./store-messages.server";
import type { StoreTarget } from "./store-messages.server";

export type IngestError = DiscordRequestError;

const SnowflakeOrder: Order.Order<string> = Order.mapInput(Order.BigInt, BigInt);

const edgeId =
  (pick: (ids: Array.NonEmptyReadonlyArray<string>, order: Order.Order<string>) => string) =>
  (ids: readonly string[]): Option.Option<string> =>
    Array.match(ids, {
      onEmpty: () => Option.none(),
      onNonEmpty: (nonEmpty) => Option.some(pick(nonEmpty, SnowflakeOrder)),
    });

export const newestId = edgeId(Array.max);

export const oldestId = edgeId(Array.min);

export const isNewerThan = Order.isGreaterThan(SnowflakeOrder);

export const idsOf = (page: readonly DiscordMessage[]): readonly string[] =>
  pipe(
    page,
    Array.map(({ id }) => id),
  );

export const isFullPage = (page: readonly DiscordMessage[]): boolean => page.length >= PAGE_SIZE;

export const storeConsented = ({
  page,
  ...target
}: StoreTarget & Readonly<{ page: readonly DiscordMessage[] }>): Effect.Effect<void> =>
  loadScope(target.job.guildId).pipe(
    Effect.flatMap((scope) => {
      if (scope.status === "awaiting") {
        return Effect.void;
      }
      return storeMessages({ ...target, page });
    }),
  );

export const fetchAndStore = ({
  target,
  request,
}: Readonly<{ target: StoreTarget; request: MessagePage }>): Effect.Effect<
  readonly DiscordMessage[],
  IngestError
> =>
  listMessages(target.job.channelId, request).pipe(
    Effect.tap((page) => storeConsented({ ...target, page })),
  );

export type { StoreTarget } from "./store-messages.server";
