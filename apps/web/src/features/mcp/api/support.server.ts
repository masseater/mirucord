import { env } from "cloudflare:workers";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array, DateTime, Effect } from "effect";

import { db, supportAccess, supportGrant } from "#/shared/db/index.server";

const HISTORY_LIMIT = 100;
const FIRST_MATCH = 1;

type SupportGrantRequest = Readonly<{ guildId: string; grantedBy: string; hours: number }>;

type SupportAccessRecord = Readonly<{
  guildId: string;
  operatorId: string;
  tool: string;
  channelId: string | null;
}>;

type SupportHistory = Readonly<{
  grants: readonly Readonly<{
    grantedBy: string;
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
  }>[];
  accesses: readonly Readonly<{
    operatorId: string;
    tool: string;
    channelId: string | null;
    accessedAt: Date;
  }>[];
}>;

const nowDate = DateTime.now.pipe(Effect.map(DateTime.toDate));

const isOperator = (discordUserId: string): boolean =>
  env.SUPPORT_OPERATOR_IDS.split(",")
    .map((id) => id.trim())
    .includes(discordUserId);

const activeGrantFilter = (guildId: string, now: DateTime.Utc): SQL | undefined =>
  and(
    eq(supportGrant.guildId, guildId),
    isNull(supportGrant.revokedAt),
    gt(supportGrant.expiresAt, DateTime.toDate(now)),
  );

const hasActiveGrant = (guildId: string): Effect.Effect<boolean> =>
  DateTime.now.pipe(
    Effect.flatMap((now) =>
      Effect.promise(() =>
        db
          .select({ id: supportGrant.id })
          .from(supportGrant)
          .where(activeGrantFilter(guildId, now))
          .limit(FIRST_MATCH),
      ),
    ),
    Effect.map(Array.isReadonlyArrayNonEmpty),
  );

const grantSupport = ({ guildId, grantedBy, hours }: SupportGrantRequest): Effect.Effect<Date> =>
  DateTime.now.pipe(
    Effect.flatMap((now) => {
      const expiresAt = DateTime.toDate(DateTime.add(now, { hours }));
      return Effect.promise(() =>
        db
          .insert(supportGrant)
          .values({ guildId, grantedBy, createdAt: DateTime.toDate(now), expiresAt }),
      ).pipe(Effect.as(expiresAt));
    }),
  );

const revokeSupport = (guildId: string): Effect.Effect<void> =>
  DateTime.now.pipe(
    Effect.flatMap((now) =>
      Effect.promise(() =>
        db
          .update(supportGrant)
          .set({ revokedAt: DateTime.toDate(now) })
          .where(activeGrantFilter(guildId, now)),
      ),
    ),
    Effect.asVoid,
  );

const recordSupportAccess = (record: SupportAccessRecord): Effect.Effect<void> =>
  nowDate.pipe(
    Effect.flatMap((accessedAt) =>
      Effect.promise(() => db.insert(supportAccess).values({ ...record, accessedAt })),
    ),
    Effect.asVoid,
  );

const supportHistory = (guildId: string): Effect.Effect<SupportHistory> =>
  Effect.all({
    grants: Effect.promise(() =>
      db
        .select({
          grantedBy: supportGrant.grantedBy,
          createdAt: supportGrant.createdAt,
          expiresAt: supportGrant.expiresAt,
          revokedAt: supportGrant.revokedAt,
        })
        .from(supportGrant)
        .where(eq(supportGrant.guildId, guildId))
        .orderBy(desc(supportGrant.createdAt))
        .limit(HISTORY_LIMIT),
    ),
    accesses: Effect.promise(() =>
      db
        .select({
          operatorId: supportAccess.operatorId,
          tool: supportAccess.tool,
          channelId: supportAccess.channelId,
          accessedAt: supportAccess.accessedAt,
        })
        .from(supportAccess)
        .where(eq(supportAccess.guildId, guildId))
        .orderBy(desc(supportAccess.accessedAt))
        .limit(HISTORY_LIMIT),
    ),
  });

export {
  grantSupport,
  hasActiveGrant,
  isOperator,
  recordSupportAccess,
  revokeSupport,
  supportHistory,
};
export type { SupportAccessRecord, SupportGrantRequest, SupportHistory };
