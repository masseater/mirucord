import type { DiscordRestService } from "dfx/DiscordREST";
import { Array, Effect, Option, pipe, Schema } from "effect";
import type { ReadonlyDeep } from "type-fest";

import { decodeBody, withDiscord } from "./client.server";
import type { DiscordFailure, DiscordRequestError } from "./client.server";
import { NOT_FOUND } from "./discord.server";

const USERS_PER_PAGE = 100;

const Users = Schema.NullOr(Schema.Array(Schema.Struct({ user_id: Schema.String })));

const decodeUsers = decodeBody(Users);

type UserList = Readonly<{
  span: string;
  attributes: Readonly<Record<string, string>>;
  list: (
    rest: ReadonlyDeep<DiscordRestService>,
    options: Readonly<{ limit: number }>,
  ) => Effect.Effect<typeof Users.Encoded, DiscordFailure>;
}>;

const userIdsOf = (users: typeof Users.Type): readonly string[] =>
  pipe(
    Option.getOrElse(Option.fromNullOr(users), () => []),
    Array.map(({ user_id }) => user_id),
  );

const liveUserIdsOf = ({
  span,
  attributes,
  list,
}: UserList): Effect.Effect<Option.Option<readonly string[]>, DiscordRequestError> =>
  withDiscord((rest) =>
    list(rest, { limit: USERS_PER_PAGE }).pipe(Effect.flatMap(decodeUsers)),
  ).pipe(
    Effect.map((users) => Option.some(userIdsOf(users))),
    Effect.catchIf(
      (error) => Option.contains(error.status, NOT_FOUND),
      () => Effect.succeedNone,
    ),
    Effect.withSpan(span, { attributes }),
  );

type EventRef = Readonly<{ guildId: string; eventId: string }>;

const liveInterestedOf = ({
  guildId,
  eventId,
}: EventRef): Effect.Effect<Option.Option<readonly string[]>, DiscordRequestError> =>
  liveUserIdsOf({
    span: "liveInterested",
    attributes: { guildId, eventId },
    list: (rest, options) => rest.listGuildScheduledEventUsers(guildId, eventId, options),
  });

const liveThreadMembersOf = (
  threadId: string,
): Effect.Effect<Option.Option<readonly string[]>, DiscordRequestError> =>
  liveUserIdsOf({
    span: "liveThreadMembers",
    attributes: { threadId },
    list: (rest, options) => rest.listThreadMembers(threadId, options),
  });

export { liveInterestedOf, liveThreadMembersOf };
export type { EventRef };
