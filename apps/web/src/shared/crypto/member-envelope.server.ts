import { Schema } from "effect";

import { typedEnvelope } from "./typed-envelope.server.ts";
import type { Opener, Sealer } from "./typed-envelope.server.ts";

const MemberProfileSchema = Schema.Struct({
  username: Schema.String,
  globalName: Schema.NullOr(Schema.String),
  nick: Schema.NullOr(Schema.String),
});

export type MemberProfile = typeof MemberProfileSchema.Type;

export type MemberAddress = Readonly<{ guildId: string; userId: string }>;

const ProfileJson = Schema.fromJsonString(MemberProfileSchema);

const envelope = typedEnvelope<
  MemberProfile,
  MemberAddress,
  Schema.SchemaError,
  Schema.SchemaError
>({
  encode: Schema.encodeEffect(ProfileJson),
  decode: Schema.decodeEffect(ProfileJson),
  contextOf: ({ guildId, userId }) => `${guildId}/member/${userId}`,
});

export const sealMember: Sealer<MemberProfile, MemberAddress> = envelope.seal;

export const openMember: Opener<MemberProfile, MemberAddress> = envelope.open;
