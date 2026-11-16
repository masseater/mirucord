import { Schema } from "effect";

import {
  ListLinkedAccountsInput,
  ListMembersInput,
  ListReactionsInput,
  ListVoiceSessionsInput,
} from "#/features/serve-mcp/api/tool-input";
import {
  ListLinkedAccountsOutput,
  ListMembersOutput,
  ListReactionsOutput,
  ListVoiceSessionsOutput,
} from "#/features/serve-mcp/api/tool-output";
import { SERVICE_NAME } from "#/shared/config";

import { TOOL_BASE } from "./tool-base";

export const LIST_MEMBERS_TOOL = {
  title: "List members",
  description: "List a server's members as Discord shows them, oldest join first.",
  ...TOOL_BASE,
  outputSchema: ListMembersOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListMembersInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

export const LIST_VOICE_SESSIONS_TOOL = {
  title: "List voice sessions",
  description: "List who was in which voice or stage channel and when, newest join first.",
  ...TOOL_BASE,
  outputSchema: ListVoiceSessionsOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListVoiceSessionsInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

export const LIST_REACTIONS_TOOL = {
  title: "List reactions",
  description: "List who reacted to or voted in polls on which messages, newest first.",
  ...TOOL_BASE,
  outputSchema: ListReactionsOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListReactionsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

export const LIST_LINKED_ACCOUNTS_TOOL = {
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
