import type { CallToolResult } from "@modelcontextprotocol/server";
import { asc, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, pipe, Record, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { ListLinkedAccountsOutput } from "#/features/list-members/model/linked-accounts-output";
import { SERVICE_NAME } from "#/shared/config";
import { db, linkedAccount } from "#/shared/db/index.server";
import { Ids, structuredResult, toolRegistration } from "#/shared/mcp";

const ListLinkedAccountsInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Ids.annotate({ description: "From a message's authorId or list_members" }),
});

const LIST_LINKED_ACCOUNTS_TOOL = {
  name: "list_linked_accounts",
  title: "List linked accounts",
  description: `Deprecated, removed in the next release: read linkedAccounts from list_members instead. Lists the accounts on other services that people chose to show through ${SERVICE_NAME}.`,
  outputSchema: ListLinkedAccountsOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListLinkedAccountsInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

type Output = typeof ListLinkedAccountsOutput.Type;

type LinkedRow = typeof linkedAccount.$inferSelect;

const ROW_CHUNK = 90;

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

export const linkedAccountsOf = (
  userIds: readonly string[],
): Effect.Effect<Readonly<Record<string, Output["people"][number]["accounts"]>>> =>
  Effect.forEach(pipe(userIds, Array.chunksOf(ROW_CHUNK)), readRows, { concurrency: 1 }).pipe(
    Effect.map(Array.flatten),
    Effect.map((rows) =>
      Record.fromEntries(
        pipe(
          peopleOf(rows),
          Array.map(({ userId, accounts }) => [userId, accounts] as const),
        ),
      ),
    ),
  );

const linkedPeopleOf = (
  scope: GuildScope,
  input: typeof ListLinkedAccountsInput.Type,
): Effect.Effect<Output> =>
  Effect.promise(() =>
    guildStore(scope.guild.guildId).readMembers({ userIds: input.userIds, includeLeft: false }),
  ).pipe(
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
      return linkedPeopleOf(scope, input).pipe(Effect.flatMap(structuredResult));
    });

export const registerListLinkedAccounts = toolRegistration({
  ...LIST_LINKED_ACCOUNTS_TOOL,
  handler: listLinkedAccounts,
});
