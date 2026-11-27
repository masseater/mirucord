import { Effect, Option } from "effect";

import { loadConsentDetail } from "#/entities/scope/index.server";
import { wrappedKeyOf } from "#/shared/db/index.server";

const consentedKey = (guildId: string): Effect.Effect<Option.Option<string>> =>
  loadConsentDetail(guildId).pipe(
    Effect.flatMap(({ status }) => {
      if (status === "granted") {
        return wrappedKeyOf(guildId);
      }
      return Effect.succeedNone;
    }),
  );

export const whenConsented =
  (guildId: string) =>
  <Failure>(
    use: (wrappedKey: string) => Effect.Effect<void, Failure>,
  ): Effect.Effect<void, Failure> =>
    consentedKey(guildId).pipe(
      Effect.flatMap(Option.match({ onNone: () => Effect.void, onSome: use })),
    );
