import { eq } from "drizzle-orm";
import { Array, Effect, Option } from "effect";

import type { ConsentDetail } from "#/entities/scope/model/consent-detail";
import { db, ingestConsent } from "#/shared/db/index.server";

export const loadConsentDetail = (guildId: string): Effect.Effect<ConsentDetail> =>
  Effect.promise(() =>
    db.select().from(ingestConsent).where(eq(ingestConsent.guildId, guildId)),
  ).pipe(
    Effect.map((rows) =>
      Option.match(Array.head(rows), {
        onNone: (): ConsentDetail => ({ status: "awaiting" }),
        onSome: (row): ConsentDetail => {
          if (row.state === "withdrawing") {
            return { status: "withdrawing" };
          }
          return {
            status: "granted",
            grantedBy: row.grantedBy,
            grantedAt: row.grantedAt.getTime(),
            noticeChannelId: row.noticeChannelId,
          };
        },
      }),
    ),
  );
