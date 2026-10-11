import { Array, DateTime, Effect, Option, pipe } from "effect";

import type { DiscordMessage } from "#/shared/discord/index.server";

import { fetchAndStore, idsOf, isFullPage, oldestId } from "./message-page.server";
import type { IngestError, StoreTarget } from "./message-page.server";
import { channelMessagesBelow, channelMessagesSince, deleteMessages } from "./message-rows.server";
import type { VectorizeError } from "./message-rows.server";

const oldestTimestamp = (page: readonly DiscordMessage[]): Option.Option<DateTime.DateTime> =>
  Array.match(page, {
    onEmpty: () => Option.none(),
    onNonEmpty: (nonEmpty) => {
      const timestamps = pipe(
        nonEmpty,
        Array.map(({ timestamp }) => timestamp),
      );
      return Option.some(Array.min(timestamps, DateTime.Order));
    },
  });

const removeDeleted = ({
  channelId,
  latest,
}: Readonly<{
  channelId: string;
  latest: readonly DiscordMessage[];
}>): Effect.Effect<void, VectorizeError> => {
  const since = Option.some(latest).pipe(
    Option.filter(isFullPage),
    Option.flatMap(oldestTimestamp),
  );
  const present = new Set(idsOf(latest));
  return channelMessagesSince({ channelId, since }).pipe(
    Effect.map((stored) => stored.filter((id) => !present.has(id))),
    Effect.flatMap(deleteMessages),
  );
};

const oldestOfFullPage = (page: readonly DiscordMessage[]): Option.Option<string> =>
  Option.filter(oldestId(idsOf(page)), () => isFullPage(page));

const sweepStart = (
  sweep: Option.Option<string>,
  latest: readonly DiscordMessage[],
): Option.Option<string> => Option.orElse(sweep, () => oldestOfFullPage(latest));

const sweepBelow = (
  target: StoreTarget,
  cursor: string,
): Effect.Effect<Option.Option<string>, IngestError> =>
  fetchAndStore({ target, request: { direction: "before", cursor } }).pipe(
    Effect.flatMap((page) => {
      const next = oldestOfFullPage(page);
      const present = new Set(idsOf(page));
      return channelMessagesBelow({
        channelId: target.job.channelId,
        below: cursor,
        from: next,
      }).pipe(
        Effect.map((stored) => stored.filter((id) => !present.has(id))),
        Effect.flatMap(deleteMessages),
        Effect.as(next),
      );
    }),
  );

const sweepHistory = ({
  target,
  sweep,
  latest,
}: Readonly<{
  target: StoreTarget;
  sweep: Option.Option<string>;
  latest: readonly DiscordMessage[];
}>): Effect.Effect<Option.Option<string>, IngestError> =>
  Option.match(sweepStart(sweep, latest), {
    onNone: () => Effect.succeedNone,
    onSome: (cursor) => sweepBelow(target, cursor),
  });

export { removeDeleted, sweepHistory };
