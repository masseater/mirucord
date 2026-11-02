import { DiscordMemberSchema } from "@repo/shared-util-discord";
import type { DiscordMember } from "@repo/shared-util-discord";
import { Array, Effect, Option, Schema } from "effect";

import { decodeBody, withDiscord } from "./client.server";
import type { DiscordRequestError } from "./client.server";

const MEMBER_PAGE = 1000;

const decodeMembers = decodeBody(Schema.Array(DiscordMemberSchema));

const listMembersAfter = (
  guildId: string,
  after: Option.Option<string>,
): Effect.Effect<readonly DiscordMember[], DiscordRequestError> =>
  withDiscord((rest) =>
    rest.listGuildMembers(guildId, { limit: MEMBER_PAGE, after: Option.getOrUndefined(after) }),
  ).pipe(
    Effect.flatMap(decodeMembers),
    Effect.flatMap((page) => {
      const next = Array.last(page).pipe(
        Option.filter(() => page.length === MEMBER_PAGE),
        Option.map(({ user }) => user.id),
      );
      return Option.match(next, {
        onNone: () => Effect.succeed(page),
        onSome: (cursor) =>
          listMembersAfter(guildId, Option.some(cursor)).pipe(Effect.map(Array.prependAll(page))),
      });
    }),
  );

const listGuildMembers = (
  guildId: string,
): Effect.Effect<readonly DiscordMember[], DiscordRequestError> =>
  listMembersAfter(guildId, Option.none());

export { listGuildMembers };
