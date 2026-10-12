import { eq } from "drizzle-orm";
import { Array, Effect } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import { db, guild } from "#/shared/db/index.server";

type EraseResult = Readonly<{ status: "erased" }> | Readonly<{ status: "notFound" }>;

const eraseOwnMessages = ({
  guildId,
  authorId,
}: Readonly<{ guildId: string; authorId: string }>): Effect.Effect<EraseResult> =>
  Effect.promise(() => db.select({ id: guild.id }).from(guild).where(eq(guild.id, guildId))).pipe(
    Effect.flatMap((found): Effect.Effect<EraseResult> => {
      if (Array.isReadonlyArrayEmpty(found)) {
        return Effect.succeed({ status: "notFound" });
      }
      return Effect.promise(() => guildStore(guildId).eraseAuthor(authorId)).pipe(
        Effect.as<EraseResult>({ status: "erased" }),
      );
    }),
  );

export { eraseOwnMessages };
export type { EraseResult };
