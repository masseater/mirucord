import { Effect, Function, Schema } from "effect";

import { seal, unseal } from "./message-envelope.server";

const DATA_FIRST_ARITY = 3;

const MemberProfileSchema = Schema.Struct({
  username: Schema.String,
  globalName: Schema.NullOr(Schema.String),
  nick: Schema.NullOr(Schema.String),
});

type MemberProfile = typeof MemberProfileSchema.Type;

type MemberAddress = Readonly<{ guildId: string; userId: string }>;

const ProfileJson = Schema.fromJsonString(MemberProfileSchema);
const encodeProfile = Schema.encodeEffect(ProfileJson);
const decodeProfile = Schema.decodeEffect(ProfileJson);

const contextOf = ({ guildId, userId }: MemberAddress): string => `${guildId}/member/${userId}`;

const sealMemberDataFirst = (
  profile: MemberProfile,
  key: CryptoKey,
  address: MemberAddress,
): Effect.Effect<string> => {
  const sealWithKey = seal(key, contextOf(address));
  return encodeProfile(profile).pipe(Effect.orDie, Effect.flatMap(sealWithKey));
};

const sealMember: {
  (key: CryptoKey, address: MemberAddress): (profile: MemberProfile) => Effect.Effect<string>;
  (profile: MemberProfile, key: CryptoKey, address: MemberAddress): Effect.Effect<string>;
} = Function.dual(DATA_FIRST_ARITY, sealMemberDataFirst);

const openMemberDataFirst = (
  sealed: string,
  key: CryptoKey,
  address: MemberAddress,
): Effect.Effect<MemberProfile> =>
  unseal(sealed, key, contextOf(address)).pipe(Effect.flatMap(decodeProfile), Effect.orDie);

const openMember: {
  (key: CryptoKey, address: MemberAddress): (sealed: string) => Effect.Effect<MemberProfile>;
  (sealed: string, key: CryptoKey, address: MemberAddress): Effect.Effect<MemberProfile>;
} = Function.dual(DATA_FIRST_ARITY, openMemberDataFirst);

export { openMember, sealMember };
export type { MemberAddress, MemberProfile };
