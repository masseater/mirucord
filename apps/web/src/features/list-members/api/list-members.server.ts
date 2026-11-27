import type { CallToolResult } from "@modelcontextprotocol/server";
import { Array, DateTime, Effect, Option, Order, pipe, Schema, String as Str } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredMember } from "#/entities/guild-message/index.server";
import { ConsentOutput } from "#/entities/scope";
import { withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { openGuildKey, openMember } from "#/shared/crypto/index.server";
import { loadRoles } from "#/shared/db/index.server";
import {
  FIRST_OFFSET,
  Ids,
  MemberLimit,
  memberLimitOf,
  Offset,
  structuredResult,
  toolRegistration,
} from "#/shared/mcp";

const ListMembersInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Schema.optionalKey(
    Ids.annotate({
      description:
        "From a message's authorId or mentions. Includes people who left unless includeLeft is false",
    }),
  ),
  query: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description: "Matches the user name, display name or nickname, ignoring case",
    }),
  ),
  includeLeft: Schema.optionalKey(Schema.Boolean),
  limit: Schema.optionalKey(MemberLimit),
  offset: Offset,
});

const Member = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  globalName: Schema.NullOr(Schema.String),
  nick: Schema.NullOr(Schema.String),
  roles: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  bot: Schema.Boolean,
  joinedAt: Schema.NullOr(Schema.String),
  leftAt: Schema.NullOr(Schema.String),
});

const ListMembersOutput = Schema.Struct({
  ingest: ConsentOutput,
  total: Schema.Int,
  members: Schema.Array(Member),
});

const LIST_MEMBERS_TOOL = {
  name: "list_members",
  title: "List members",
  description: "List a server's members as Discord shows them, oldest join first.",
  outputSchema: ListMembersOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListMembersInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

type MemberView = (typeof ListMembersOutput.Type)["members"][number];

type MemberRequest = Readonly<{ scope: GuildScope; input: typeof ListMembersInput.Type }>;

const isoOf = (at: number | null): string | null =>
  Option.getOrNull(
    Option.fromNullOr(at).pipe(
      Option.map((millis) => DateTime.formatIso(DateTime.makeUnsafe(millis))),
    ),
  );

const roleNamesOf = (guildId: string): Effect.Effect<ReadonlyMap<string, string>> =>
  loadRoles(guildId).pipe(
    Effect.map(
      (rows) =>
        new Map(
          pipe(
            rows,
            Array.map(({ id, name }) => [id, name] as const),
          ),
        ),
    ),
  );

const byJoined = Order.combine(
  Order.mapInput(Option.makeOrder(Order.Number), ({ joinedAt }: StoredMember) =>
    Option.fromNullOr(joinedAt),
  ),
  Order.mapInput(Order.String, ({ userId }: StoredMember) => userId),
);

const matchesQuery =
  (query: string) =>
  ({ username, globalName, nick }: MemberView): boolean =>
    pipe(
      [username, globalName, nick],
      Array.flatMap((name) => Option.toArray(Option.fromNullOr(name))),
      Array.some((name) => Str.includes(Str.toLowerCase(query))(Str.toLowerCase(name))),
    );

const viewsOf = (
  { scope }: MemberRequest,
  stored: readonly StoredMember[],
): Effect.Effect<readonly MemberView[]> =>
  Effect.gen(function* views() {
    const { guildId, wrappedKey } = scope.guild;
    const key = yield* openGuildKey(wrappedKey);
    const roleNames = yield* roleNamesOf(guildId);
    const roleOf = (id: string): MemberView["roles"] =>
      Option.match(Option.fromUndefinedOr(roleNames.get(id)), {
        onNone: () => [],
        onSome: (name) => [{ id, name }],
      });
    const rolesOf = (ids: readonly string[]): MemberView["roles"] =>
      pipe(ids, Array.flatMap(roleOf));
    return yield* Effect.forEach(
      stored,
      (member) =>
        openMember(member.sealed, key, { guildId, userId: member.userId }).pipe(
          Effect.map((profile): MemberView => ({
            id: member.userId,
            username: profile.username,
            globalName: profile.globalName,
            nick: profile.nick,
            roles: rolesOf(member.roles),
            bot: member.bot,
            joinedAt: isoOf(member.joinedAt),
            leftAt: isoOf(member.leftAt),
          })),
        ),
      { concurrency: 1 },
    );
  });

const pageOf = <Item>(items: readonly Item[], { input }: MemberRequest): readonly Item[] => {
  const offset = Option.getOrElse(Option.fromUndefinedOr(input.offset), () => FIRST_OFFSET);
  return items.slice(offset, offset + memberLimitOf(input.limit));
};

const storedMembers = ({ scope, input }: MemberRequest): Effect.Effect<readonly StoredMember[]> => {
  const userIds = Option.fromUndefinedOr(input.userIds);
  return Effect.promise(() =>
    guildStore(scope.guild.guildId).readMembers({
      userIds: Option.getOrNull(userIds),
      includeLeft: Option.getOrElse(Option.fromUndefinedOr(input.includeLeft), () =>
        Option.isSome(userIds),
      ),
    }),
  ).pipe(Effect.map((members) => Array.sort(members, byJoined)));
};

const membersOf = (request: MemberRequest): Effect.Effect<typeof ListMembersOutput.Type> =>
  storedMembers(request).pipe(
    Effect.flatMap((sorted) =>
      Option.match(Option.fromUndefinedOr(request.input.query), {
        onNone: () =>
          viewsOf(request, pageOf(sorted, request)).pipe(
            Effect.map((members) => ({ total: sorted.length, members })),
          ),
        onSome: (query) =>
          viewsOf(request, sorted).pipe(
            Effect.map((views) => {
              const matched = pipe(views, Array.filter(matchesQuery(query)));
              return { total: matched.length, members: pageOf(matched, request) };
            }),
          ),
      }),
    ),
    Effect.map((found) => ({ ingest: "consented" as const, ...found })),
  );

const listMembers =
  (discordUserId: string) =>
  (input: typeof ListMembersInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (scope.guild.consent !== "consented") {
        return structuredResult({
          ingest: "notConsented",
          total: 0,
          members: [],
        } satisfies typeof ListMembersOutput.Type);
      }
      return membersOf({ scope, input }).pipe(Effect.flatMap(structuredResult));
    });

export const registerListMembers = toolRegistration({ ...LIST_MEMBERS_TOOL, handler: listMembers });
