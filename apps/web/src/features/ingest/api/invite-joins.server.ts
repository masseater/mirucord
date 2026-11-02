import { Array, Clock, DateTime, Duration, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { listGuildInviteCounts } from "#/shared/discord/index.server";
import type {
  DiscordGuildMember,
  DiscordRequestError,
  GuildInviteCount,
} from "#/shared/discord/index.server";

type Joiner = Readonly<{ userId: string; joinedAt: number }>;

type InviteJoinRequest = Readonly<{ guildId: string; joiners: readonly Joiner[] }>;

const JOIN_WINDOW_MINUTES = 10;
const JOIN_WINDOW = Duration.minutes(JOIN_WINDOW_MINUTES);

const joinersOf =
  (now: number) =>
  (members: readonly DiscordGuildMember[]): readonly Joiner[] =>
    pipe(
      members,
      Array.flatMap(({ user, joined_at }) =>
        pipe(
          Option.fromNullishOr(joined_at),
          Option.map(DateTime.toEpochMillis),
          Option.filter((joinedAt) => now - joinedAt <= Duration.toMillis(JOIN_WINDOW)),
          Option.map((joinedAt) => ({ userId: user.id, joinedAt })),
          Option.toArray,
        ),
      ),
    );

const logStored = (counts: Readonly<Record<string, string | number>>): Effect.Effect<void> =>
  Effect.logInfo("Invite counts stored").pipe(Effect.annotateLogs(counts));

const saveCounts =
  ({ guildId, joiners }: InviteJoinRequest, fetchedAt: number) =>
  (invites: readonly GuildInviteCount[]): Effect.Effect<void> =>
    Effect.promise(() =>
      guildStore(guildId).recordInviteJoins({ fetchedAt, invites, joiners }),
    ).pipe(
      Effect.andThen(logStored({ guildId, joiners: joiners.length, invites: invites.length })),
    );

const notReadable = (guildId: string): Effect.Effect<void> =>
  Effect.logInfo("Invites not readable").pipe(Effect.annotateLogs({ guildId }));

const countsFor =
  (request: InviteJoinRequest) =>
  (fetchedAt: number): Effect.Effect<void, DiscordRequestError> => {
    const save = saveCounts(request, fetchedAt);
    return listGuildInviteCounts(request.guildId).pipe(
      Effect.flatMap(Option.match({ onNone: () => notReadable(request.guildId), onSome: save })),
    );
  };

const recordInviteJoins = (request: InviteJoinRequest): Effect.Effect<void> =>
  Clock.currentTimeMillis.pipe(
    Effect.flatMap(countsFor(request)),
    Effect.catchTag("DiscordRequestError", ({ status }) =>
      Effect.logWarning("Could not list invites").pipe(
        Effect.annotateLogs({ guildId: request.guildId, status: Option.getOrNull(status) }),
      ),
    ),
    Effect.withSpan("recordInviteJoins", { attributes: { guildId: request.guildId } }),
  );

export { joinersOf, recordInviteJoins };
