import { Schema } from "effect";

import { Author } from "./message";

export const Member = Schema.Struct({
  user: Author,
  nick: Schema.optional(Schema.NullOr(Schema.String)),
  roles: Schema.Array(Schema.String),
  joined_at: Schema.optional(Schema.NullOr(Schema.DateTimeUtcFromString)),
});

export type DiscordMember = typeof Member.Type;
