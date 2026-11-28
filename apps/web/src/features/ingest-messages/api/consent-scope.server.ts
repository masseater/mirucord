import { and, eq, inArray, or } from "drizzle-orm";
import { Array, Effect, pipe } from "effect";

import { MESSAGE_TYPES } from "#/features/ingest-messages/model/channel-kind";
import type { ConsentScope } from "#/features/ingest-messages/model/consent-scope";
import { channel, db } from "#/shared/db/index.server";

import { enqueue, enqueueMembers } from "./enqueue.server.ts";
import { loadScope } from "./load-scope.server.ts";
import { purgeOutOfScope } from "./purge-channel.server.ts";

const READABLE_MESSAGES = and(
  eq(channel.botAccess, "readable"),
  inArray(channel.type, [...MESSAGE_TYPES]),
);

const INGEST_REACH = {
  all: and(READABLE_MESSAGES, or(eq(channel.archive, "open"), eq(channel.backfill, "pending"))),
  pending: and(READABLE_MESSAGES, eq(channel.backfill, "pending")),
} as const;

type IngestReach = keyof typeof INGEST_REACH;

type IngestRefresh = Readonly<{ guildId: string; reach: IngestReach }>;

const enqueueReadable = ({ guildId, reach }: IngestRefresh): Effect.Effect<void> =>
  Effect.promise(() =>
    db
      .select({ id: channel.id })
      .from(channel)
      .where(and(eq(channel.guildId, guildId), INGEST_REACH[reach])),
  ).pipe(
    Effect.flatMap((rows) =>
      enqueue(
        pipe(
          rows,
          Array.map(({ id }) => ({ guildId, channelId: id })),
        ),
      ),
    ),
  );

const enqueueInScope = (refresh: IngestRefresh, scope: ConsentScope): Effect.Effect<void> => {
  if (scope.status === "awaiting") {
    return Effect.void;
  }
  return enqueueReadable(refresh);
};

const refreshIngestOf = (refresh: IngestRefresh): Effect.Effect<void> =>
  loadScope(refresh.guildId).pipe(
    Effect.tap((scope) => purgeOutOfScope({ guildId: refresh.guildId, scope })),
    Effect.flatMap((scope) => enqueueInScope(refresh, scope)),
  );

export const refreshIngest = (guildId: string): Effect.Effect<void> =>
  refreshIngestOf({ guildId, reach: "all" });

export const refreshConsented = (guildId: string): Effect.Effect<void> =>
  refreshIngest(guildId).pipe(Effect.andThen(enqueueMembers(guildId)));

export const refreshPendingIngest = (guildId: string): Effect.Effect<void> =>
  refreshIngestOf({ guildId, reach: "pending" });
