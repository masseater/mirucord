import { Array, Effect, Option, pipe, Schema } from "effect";

import { decodeBody, withDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";
import { FORBIDDEN } from "./discord.server";

type GuildInviteCount = Readonly<{
  code: string;
  inviterId: string | null;
  channelId: string | null;
  uses: number;
  maxUses: number;
}>;

const Ref = Schema.Struct({ id: Schema.String });

const OptionalRef = Schema.optional(Schema.NullOr(Ref));

const Invite = Schema.Struct({
  code: Schema.String,
  inviter: OptionalRef,
  channel: OptionalRef,
  uses: Schema.optional(Schema.Int),
  max_uses: Schema.optional(Schema.Int),
});

const Invites = Schema.NullOr(Schema.Array(Schema.NullOr(Invite)));

const decodeInvites = decodeBody(Invites);

const countOf = (invite: typeof Invite.Type): readonly GuildInviteCount[] =>
  Option.match(Option.fromUndefinedOr(invite.uses), {
    onNone: () => [],
    onSome: (uses) => [
      {
        code: invite.code,
        inviterId: Option.getOrNull(
          Option.map(Option.fromNullishOr(invite.inviter), ({ id }) => id),
        ),
        channelId: Option.getOrNull(
          Option.map(Option.fromNullishOr(invite.channel), ({ id }) => id),
        ),
        uses,
        maxUses: Option.getOrElse(Option.fromUndefinedOr(invite.max_uses), () => uses),
      },
    ],
  });

const countsOf = (
  invites: readonly (typeof Invite.Type | null)[] | null,
): readonly GuildInviteCount[] =>
  pipe(
    Option.getOrElse(Option.fromNullOr(invites), () => []),
    Array.flatMap((invite) => Option.toArray(Option.fromNullOr(invite))),
    Array.flatMap(countOf),
  );

const listGuildInviteCounts = (
  guildId: string,
): Effect.Effect<Option.Option<readonly GuildInviteCount[]>, DiscordRequestError> =>
  withDiscord((rest) => rest.listGuildInvites(guildId).pipe(Effect.flatMap(decodeInvites))).pipe(
    Effect.map((invites) => Option.some(countsOf(invites))),
    Effect.catchIf(
      (error) => Option.contains(error.status, FORBIDDEN),
      () => Effect.succeedNone,
    ),
    Effect.withSpan("listGuildInviteCounts", { attributes: { guildId } }),
  );

export { listGuildInviteCounts };
export type { GuildInviteCount };
