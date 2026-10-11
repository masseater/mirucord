import { Effect, Option } from "effect";

import type { DiscordMessage } from "#/shared/discord/index.server";

import { fetchAndStore, idsOf, isFullPage, oldestId } from "./message-page.server";
import type { IngestError, StoreTarget } from "./message-page.server";
import { channelMessagesBelow, deleteMessages } from "./message-rows.server";

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

export { sweepHistory };
