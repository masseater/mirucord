import { Array, Effect, Option, pipe, Schema } from "effect";

import { decodeBody, withDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";
import { NOT_FOUND } from "./discord.server";

const USERS_PER_PAGE = 100;

const Interested = Schema.NullOr(Schema.Array(Schema.Struct({ user_id: Schema.String })));

const decodeInterested = decodeBody(Interested);

const userIdsOf = (users: typeof Interested.Type): readonly string[] =>
  pipe(
    Option.getOrElse(Option.fromNullOr(users), () => []),
    Array.map(({ user_id }) => user_id),
  );

type EventRef = Readonly<{ guildId: string; eventId: string }>;

const liveInterestedOf = ({
  guildId,
  eventId,
}: EventRef): Effect.Effect<Option.Option<readonly string[]>, DiscordRequestError> =>
  withDiscord((rest) =>
    rest
      .listGuildScheduledEventUsers(guildId, eventId, { limit: USERS_PER_PAGE })
      .pipe(Effect.flatMap(decodeInterested)),
  ).pipe(
    Effect.map((users) => Option.some(userIdsOf(users))),
    Effect.catchIf(
      (error) => Option.contains(error.status, NOT_FOUND),
      () => Effect.succeedNone,
    ),
    Effect.withSpan("liveInterested", { attributes: { guildId, eventId } }),
  );

export { liveInterestedOf };
export type { EventRef };
