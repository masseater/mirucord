import { Schema } from "effect";

import {
  ListAuditLogInput,
  ListLinkedAccountsInput,
  ListMemberInvitesInput,
  ListMembersInput,
  ListReactionsInput,
  ListScheduledEventsInput,
  ListThreadMembersInput,
  ListVoiceSessionsInput,
} from "#/features/mcp/api/tool-input";
import {
  ListAuditLogOutput,
  ListLinkedAccountsOutput,
  ListMemberInvitesOutput,
  ListMembersOutput,
  ListReactionsOutput,
  ListScheduledEventsOutput,
  ListThreadMembersOutput,
  ListVoiceSessionsOutput,
} from "#/features/mcp/api/tool-output";
import { SERVICE_NAME } from "#/shared/config";

import { TOOL_BASE } from "./tool-base";

const LIST_MEMBERS_TOOL = {
  title: "List members",
  description: `List a server's members as Discord shows them: user name, global display name, server nickname, roles, whether the account is a bot, when they joined and, for people who left, when ${SERVICE_NAME} saw them leave. Members come oldest join first. Pass \`userIds\` to look people up by ID (from a message's \`authorId\` or \`mentions\`); people who left are included then unless \`includeLeft\` is false. \`query\` matches any of the three names, ignoring letter case. \`total\` counts all matches; advance \`offset\` by \`limit\` to page. People who left before ${SERVICE_NAME} first stored the member list are not included. Members are only stored once the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none.`,
  ...TOOL_BASE,
  outputSchema: ListMembersOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListMembersInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const LIST_VOICE_SESSIONS_TOOL = {
  title: "List voice sessions",
  description: `List who was in which voice or stage channel and when, newest join first, for the channels you can see. Each session is one person's stay in one channel; moving to another channel ends it and starts a new one. \`left\` is null while they are still there. \`precision\` is \`exact\` when ${SERVICE_NAME} saw the join or leave as it happened, and \`noLaterThan\` when it only learned of it after reconnecting to Discord, so the real time is at or before \`at\`. Pass \`userIds\` or \`channelIds\` to narrow, and \`since\`/\`until\` (ISO 8601) to keep sessions that overlap that span. Look up names with \`list_members\`. Two people's sessions in the same channel overlapping means they were in the call together. Sessions are only recorded after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none, and nothing from before 2026-11 exists.`,
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

const LIST_REACTIONS_TOOL = {
  title: "List reactions",
  description: `List who reacted to or voted in a poll on which message, newest first, for the channels you can see. \`emoji\` is the Unicode emoji, or \`name:id\` for a custom one; \`burst\` marks a super reaction. \`messageAuthorId\` is who wrote the reacted message, when Discord said so. Pass \`userIds\` for who reacted or voted, \`authorIds\` for whose messages got reactions (it narrows reactions only), \`channelIds\`, and \`since\`/\`until\` (ISO 8601). \`reactionTotal\` and \`voteTotal\` count all matches; advance \`offset\` by \`limit\` to page both. Reactions are only recorded after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none and nothing from before 2026-11 is stored. To see reactions and votes older than that, pass \`message\` (its \`channelId\` and \`messageId\`): \`live\` then holds what Discord shows on that message now, up to 100 people per emoji or answer and 20 emoji; it is null when no message is given or the message is gone. Look up names with \`list_members\`.`,
  ...TOOL_BASE,
  outputSchema: ListReactionsOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListReactionsInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const LIST_SCHEDULED_EVENTS_TOOL = {
  title: "List scheduled events",
  description: `List the server's scheduled events (the Events tab), soonest start first, with who created each and who marked themselves interested. \`kind\` is \`stage_instance\`, \`voice\` or \`external\` (then \`location\` says where); \`status\` is \`scheduled\`, \`active\`, \`completed\` or \`canceled\`. \`removedAt\` is when the event was deleted or ended in Discord, which keeps it here as history. Events in channels you cannot see are left out. Pass \`userIds\` to keep events those people created or are interested in, \`channelIds\`, and \`since\`/\`until\` (ISO 8601) to keep events that overlap that span. \`interestedUserIds\` only holds what ${SERVICE_NAME} saw after the server's admin allowed it to store data; pass \`eventId\` to also get \`liveInterestedUserIds\`, the first 100 people Discord lists as interested now. \`notConsented\` returns none. Look up names with \`list_members\`.`,
  ...TOOL_BASE,
  outputSchema: ListScheduledEventsOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListScheduledEventsInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

const LIST_THREAD_MEMBERS_TOOL = {
  title: "List thread members",
  description: `List who joined which thread and when, earliest join first, for the threads you can see. Discord adds people to a thread when they post in it, are mentioned in it or join it themselves, so being a member means taking part in or following that thread. \`leftAt\` is when they left or were removed; people who left are only included when \`includeLeft\` is true. Pass \`threadId\` for one thread and \`userIds\` to see which threads those people are in. \`total\` counts all matches; advance \`offset\` by \`limit\` to page. Members are only recorded after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none and nothing from before 2026-11 is stored; pass \`threadId\` to also get \`liveUserIds\`, the first 100 people Discord lists in that thread now. Look up names with \`list_members\`.`,
  ...TOOL_BASE,
  outputSchema: ListThreadMembersOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListThreadMembersInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

const LIST_AUDIT_LOG_TOOL = {
  title: "List audit log",
  description: `List the server's audit log, newest first: who (\`userId\`) did what (\`action\`, such as \`member_role_update\`, \`member_kick\`, \`member_ban_add\`, \`invite_create\` or \`channel_create\`) to whom or what (\`targetId\`), with the reason and the changed fields as Discord gives them. Only people who have the View Audit Log permission in the server can read it. Pass \`userIds\` to keep entries those people did or that were done to them, \`actions\` to keep those kinds, and \`since\`/\`until\` (ISO 8601). \`total\` counts all matches; advance \`offset\` by \`limit\` to page. Entries are only recorded after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none and nothing from before 2026-11 is stored; Discord itself keeps entries for 45 days and ${SERVICE_NAME} keeps them after that. Look up names with \`list_members\`.`,
  ...TOOL_BASE,
  outputSchema: ListAuditLogOutput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
  inputSchema: ListAuditLogInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1),
};

const LIST_MEMBER_INVITES_TOOL = {
  title: "List member invites",
  description: `List which invite link people joined the server through, newest join first: the invite \`code\`, who made it (\`inviterId\`) and the channel it points to. Discord does not say which invite someone used, so ${SERVICE_NAME} compares each invite's use count before and after the join. \`precision\` is \`exact\` when one person joined and one invite's count went up, \`ambiguous\` when several people joined at once or several counts went up (\`invites\` then lists every invite that could have been used, including one-time invites that ran out), and \`unknown\` when no count changed, such as joining through a vanity URL, Server Discovery or a bot, or when ${SERVICE_NAME} had no earlier count to compare. Only people who have the Manage Server permission in the server can read it, and joins are only recorded when ${SERVICE_NAME}'s bot has that permission too. Pass \`userIds\` and \`since\`/\`until\` (ISO 8601) on the join time. \`total\` counts all matches; advance \`offset\` by \`limit\` to page. Joins are only recorded after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none and nothing from before 2026-11 is stored. Look up names with \`list_members\`.`,
  ...TOOL_BASE,
  outputSchema: ListMemberInvitesOutput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
  inputSchema: ListMemberInvitesInput.pipe(
    Schema.toStandardSchemaV1,
    Schema.toStandardJSONSchemaV1,
  ),
};

const LIST_LINKED_ACCOUNTS_TOOL = {
  title: "List linked accounts",
  description: `List the accounts on other services (such as \`github\`, \`twitter\`, \`youtube\` or \`steam\` in \`type\`) that people linked to Discord and chose to show through ${SERVICE_NAME}. Pass the Discord user IDs in \`userIds\` (from a message's \`authorId\` or from \`list_members\`); only people who are in the server now are answered, and people who did not publish any account are left out of \`people\`. Each person picks which of the accounts they show to everyone on their Discord profile to publish, in ${SERVICE_NAME}'s dashboard, and the same list shows in every server. \`verified\` is Discord's check that they own the account, and \`publishedAt\` is when they last chose the list. Members are only stored after the server's admin allows ${SERVICE_NAME} to store data, so \`notConsented\` returns none.`,
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

export {
  LIST_AUDIT_LOG_TOOL,
  LIST_LINKED_ACCOUNTS_TOOL,
  LIST_MEMBER_INVITES_TOOL,
  LIST_MEMBERS_TOOL,
  LIST_REACTIONS_TOOL,
  LIST_SCHEDULED_EVENTS_TOOL,
  LIST_THREAD_MEMBERS_TOOL,
  LIST_VOICE_SESSIONS_TOOL,
};
