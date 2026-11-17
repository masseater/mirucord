import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { asc, inArray } from "drizzle-orm";
import { Array, DateTime, Effect, pipe, Record, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { ConsentOutput } from "#/entities/scope";
import { withScope } from "#/entities/scope/index.server";
import type { GuildScope } from "#/entities/scope/index.server";
import { SERVICE_NAME } from "#/shared/config";
import { db, linkedAccount } from "#/shared/db/index.server";
import { Ids, structuredResult, TOOL_BASE } from "#/shared/mcp";

export const ListLinkedAccountsInput = Schema.Struct({
  serverId: Schema.String,
  userIds: Ids.annotate({ description: "From a message's authorId or list_members" }),
});

const LinkedAccount = Schema.Struct({
  type: Schema.String,
  name: Schema.String,
  verified: Schema.Boolean.annotate({ description: "Discord checked they own it" }),
  publishedAt: Schema.String,
});

const LinkedPerson = Schema.Struct({
  userId: Schema.String,
  accounts: Schema.Array(LinkedAccount),
});

export const ListLinkedAccountsOutput = Schema.Struct({
  ingest: ConsentOutput,
  people: Schema.Array(LinkedPerson).annotate({
    description: "Current members who published accounts in the dashboard",
  }),
});

const LIST_LINKED_ACCOUNTS_TOOL = {
  title: "List linked accounts",
  description: `List the accounts on other services that people chose to show through ${SERVICE_NAME}.`,
  ...TOOL_BASE,
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
      return linkedAccountsOf(scope, input).pipe(Effect.flatMap(structuredResult));
    });

export const registerListLinkedAccounts =
  (discordUserId: string) =>
  (server: McpServer): void => {
    server.registerTool(
      "list_linked_accounts",
      LIST_LINKED_ACCOUNTS_TOOL,
      listLinkedAccounts(discordUserId),
    );
  };
