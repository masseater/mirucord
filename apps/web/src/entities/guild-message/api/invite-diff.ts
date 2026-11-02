import { Array, Match, Option, pipe } from "effect";

import type { guildInvite, InviteCandidate } from "#/entities/guild-message/model/invite.schema";

type InviteCount = typeof guildInvite.$inferSelect;

type JoinPrecision = "exact" | "ambiguous" | "unknown";

const UNUSED = 0;
const UNLIMITED = 0;
const ONE_USE = 1;

const candidateOf = ({ code, inviterId, channelId }: InviteCount): InviteCandidate => ({
  code,
  inviterId,
  channelId,
});

const hasGrown =
  (previous: readonly InviteCount[]) =>
  ({ code, uses }: InviteCount): boolean =>
    Option.match(
      pipe(
        previous,
        Array.findFirst((seen) => seen.code === code),
      ),
      {
        onNone: () => uses > UNUSED,
        onSome: (seen) => uses > seen.uses,
      },
    );

const wasUsedUp =
  (remaining: readonly string[]) =>
  ({ code, uses, maxUses }: InviteCount): boolean =>
    maxUses !== UNLIMITED && uses + ONE_USE >= maxUses && !Array.contains(remaining, code);

const usedSince =
  (fetched: readonly InviteCount[]) =>
  (previous: readonly InviteCount[]): readonly InviteCandidate[] => {
    const remaining = pipe(
      fetched,
      Array.map(({ code }) => code),
    );
    const grownFrom = hasGrown(previous);
    const usedUpIn = wasUsedUp(remaining);
    const grown = pipe(fetched, Array.filter(grownFrom));
    const usedUp = pipe(previous, Array.filter(usedUpIn));
    return pipe([...grown, ...usedUp], Array.map(candidateOf));
  };

const precisionOf =
  (joiners: readonly unknown[]) =>
  (candidates: readonly InviteCandidate[]): JoinPrecision =>
    Match.value({ joiners: joiners.length, candidates: candidates.length }).pipe(
      Match.when({ candidates: UNUSED }, (): JoinPrecision => "unknown"),
      Match.when({ joiners: ONE_USE, candidates: ONE_USE }, (): JoinPrecision => "exact"),
      Match.orElse((): JoinPrecision => "ambiguous"),
    );

export { precisionOf, usedSince };
export type { InviteCount, JoinPrecision };
