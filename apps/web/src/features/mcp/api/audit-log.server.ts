import type { CallToolResult } from "@modelcontextprotocol/server";
import { Discord } from "dfx";
import { Array, DateTime, Effect, Option, pipe, Schema } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { StoredAuditEntry } from "#/entities/guild-message/index.server";
import { spanLookupOf } from "#/features/mcp/api/tool-input";
import type { ListAuditLogInput } from "#/features/mcp/api/tool-input";
import type { ListAuditLogOutput } from "#/features/mcp/api/tool-output";
import { openAudit, openGuildKey } from "#/shared/crypto/index.server";

import { labelOf, valueOf } from "./constant-label";
import type { GuildScope } from "./scope.server";
import { errorResult, structuredResult, withScope } from "./tool-scope.server";

type Output = typeof ListAuditLogOutput.Type;

type AuditRequest = Readonly<{ scope: GuildScope; input: typeof ListAuditLogInput.Type }>;

const NO_AUDIT_LOG = "You need the View Audit Log permission in this server to read its audit log";

const NOT_CONSENTED: Output = { ingest: "notConsented", total: 0, entries: [] };

const NOTHING = Option.getOrNull(Option.none<string>());

const Detail = Schema.Struct({
  reason: Schema.NullOr(Schema.String),
  changes: Schema.optional(Schema.Unknown),
  options: Schema.optional(Schema.Unknown),
});

const decodeDetail = Schema.decodeEffect(Schema.fromJsonString(Detail));

const actionOf = labelOf(Discord.AuditLogActionTypes);

const actionTypeOf = valueOf(Discord.AuditLogActionTypes);

const actionTypesOf = (actions: readonly string[] | undefined): readonly number[] | null =>
  Option.getOrNull(
    Option.map(
      Option.fromUndefinedOr(actions),
      Array.flatMap((action) => Option.toArray(actionTypeOf(action))),
    ),
  );

const viewOf =
  (open: (entry: StoredAuditEntry) => Effect.Effect<string>) =>
  (entry: StoredAuditEntry): Effect.Effect<Output["entries"][number]> =>
    open(entry).pipe(
      Effect.flatMap(decodeDetail),
      Effect.orDie,
      Effect.map(({ reason, changes, options }) => ({
        entryId: entry.id,
        action: actionOf(entry.actionType),
        userId: entry.userId,
        targetId: entry.targetId,
        at: DateTime.formatIso(DateTime.makeUnsafe(entry.at)),
        reason,
        changes: Option.getOrElse(Option.fromUndefinedOr(changes), () => NOTHING),
        options: Option.getOrElse(Option.fromUndefinedOr(options), () => NOTHING),
      })),
    );

const auditLogOf = ({ scope, input }: AuditRequest): Effect.Effect<Output> =>
  Effect.gen(function* auditLog() {
    const { guildId, wrappedKey } = scope.guild;
    const lookup = { ...spanLookupOf(input), actionTypes: actionTypesOf(input.actions) };
    const { total, entries } = yield* Effect.promise(() =>
      guildStore(guildId).readAuditEntries(lookup),
    );
    const key = yield* openGuildKey(wrappedKey);
    const open = (entry: StoredAuditEntry): Effect.Effect<string> =>
      openAudit({ key, address: { guildId, entryId: entry.id } })(entry.sealed);
    const views = yield* pipe(entries, Effect.forEach(viewOf(open)));
    return { ingest: "consented" as const, total, entries: views };
  });

const listAuditLog =
  (discordUserId: string) =>
  (input: typeof ListAuditLogInput.Type): Promise<CallToolResult> =>
    withScope({ guildId: input.serverId, discordUserId })((scope) => {
      if (!scope.seesAuditLog) {
        return Effect.succeed(errorResult(NO_AUDIT_LOG));
      }
      if (scope.guild.consent !== "consented") {
        return Effect.succeed(structuredResult(NOT_CONSENTED));
      }
      return auditLogOf({ scope, input }).pipe(Effect.map(structuredResult));
    });

export { listAuditLog };
