import type { CallToolResult } from "@modelcontextprotocol/server";
import { asc, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, pipe, Record } from "effect";

import type { ListLinkedAccountsInput } from "#/features/mcp/api/tool-input";
import type { ListLinkedAccountsOutput } from "#/features/mcp/api/tool-output";
import { db, linkedAccount } from "#/shared/db/index.server";

import { storedMembers } from "./members.server";
import type { GuildScope } from "./scope.server";
import { structuredResult, withScope } from "./tool-scope.server";

type Output = typeof ListLinkedAccountsOutput.Type;

type LinkedRow = typeof linkedAccount.$inferSelect;

const NOT_CONSENTED: Output = { ingest: "notConsented", people: [] };

const readRows = (userIds: readonly string[]): Effect.Effect<readonly LinkedRow[]> =>
  Effect.promise(() =>
    db
      .select()
      .from(linkedAccount)
      .where(inArray(linkedAccount.discordUserId, [...userIds]))
      .orderBy(asc(linkedAccount.discordUserId), asc(linkedAccount.type), asc(linkedAccount.name)),
  );

const accountOf = ({
  type,
  name,
  verified,
  publishedAt,
}: LinkedRow): Output["people"][number]["accounts"][number] => ({
  type,
  name,
  verified,
  publishedAt: DateTime.formatIso(DateTime.makeUnsafe(publishedAt)),
});

const peopleOf = (rows: readonly LinkedRow[]): Output["people"] =>
  pipe(
    rows,
    Array.groupBy(({ discordUserId }) => discordUserId),
    Record.toEntries,
    Array.map(([userId, owned]) => ({ userId, accounts: pipe(owned, Array.map(accountOf)) })),
  );

const linkedAccountsOf = (
  scope: GuildScope,
  input: typeof ListLinkedAccountsInput.Type,
): Effect.Effect<Output> =>
  storedMembers({
    scope,
    input: { serverId: input.serverId, userIds: input.userIds, includeLeft: false },
  }).pipe(
    Effect.flatMap((members) =>
      readRows(
        pipe(
          members,
          Array.map(({ userId }) => userId),
        ),
      ),
    ),
    Effect.map((rows): Output => ({ ingest: "consented", people: peopleOf(rows) })),
  );

const listLinkedAccounts =
  (discordUserId: string) =>
  (input: typeof ListLinkedAccountsInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (scope.guild.consent !== "consented") {
        return structuredResult(NOT_CONSENTED);
      }
      return linkedAccountsOf(scope, input).pipe(Effect.flatMap(structuredResult));
    });

export { listLinkedAccounts };
