import type { DepartJob, MembersJob } from "@repo/ingest-util-gateway-contract";
import { Clock, DateTime, Effect, Option, pipe } from "effect";

import { guildStore } from "#/entities/guild-message/index.server";
import type { MemberWrite } from "#/entities/guild-message/index.server";
import { openGuildKey, sealMember } from "#/shared/crypto/index.server";
import { listGuildMembers } from "#/shared/discord/index.server";
import type { DiscordGuildMember, DiscordRequestError } from "#/shared/discord/index.server";

import { whenConsented } from "./consented.server";

type StoredMemberRow = MemberWrite["members"][number];

type MemberSave = Readonly<{
  guildId: string;
  members: readonly DiscordGuildMember[];
  coverage: MemberWrite["coverage"];
}>;

const storedRowOf =
  (guildId: string, key: CryptoKey) =>
  ({ user, nick, roles, joined_at }: DiscordGuildMember): Effect.Effect<StoredMemberRow> =>
    sealMember(
      {
        username: user.username,
        globalName: Option.getOrNull(Option.fromNullishOr(user.global_name)),
        nick: Option.getOrNull(Option.fromNullishOr(nick)),
      },
      key,
      { guildId, userId: user.id },
    ).pipe(
      Effect.map((sealed) => ({
        userId: user.id,
        sealed,
        roles,
        bot: user.bot === true,
        joinedAt: Option.getOrNull(
          Option.fromNullishOr(joined_at).pipe(Option.map(DateTime.toEpochMillis)),
        ),
      })),
    );

const saveWith = (
  { guildId, members, coverage }: MemberSave,
  wrappedKey: string,
): Effect.Effect<void> =>
  Effect.gen(function* save() {
    const key = yield* openGuildKey(wrappedKey);
    const rows = yield* pipe(members, Effect.forEach(storedRowOf(guildId, key)));
    const now = yield* Clock.currentTimeMillis;
    yield* Effect.promise(() => guildStore(guildId).saveMembers({ members: rows, now, coverage }));
    yield* Effect.logInfo("Members stored").pipe(
      Effect.annotateLogs({ guildId, members: rows.length, coverage }),
    );
  });

const syncMembers = (guildId: string): Effect.Effect<void, DiscordRequestError> =>
  whenConsented(guildId)((wrappedKey) =>
    listGuildMembers(guildId).pipe(
      Effect.flatMap((members) => saveWith({ guildId, members, coverage: "complete" }, wrappedKey)),
    ),
  ).pipe(Effect.withSpan("syncMembers", { attributes: { guildId } }));

const storeGatewayMembers = ({ guildId, members }: MembersJob): Effect.Effect<void> =>
  whenConsented(guildId)((wrappedKey) =>
    saveWith({ guildId, members, coverage: "partial" }, wrappedKey),
  );

const departGatewayMembers = ({ guildId, userIds }: DepartJob): Effect.Effect<void> =>
  whenConsented(guildId)(() =>
    Clock.currentTimeMillis.pipe(
      Effect.flatMap((now) =>
        Effect.promise(() => guildStore(guildId).departMembers(userIds, now)),
      ),
    ),
  );

export { departGatewayMembers, storeGatewayMembers, syncMembers };
