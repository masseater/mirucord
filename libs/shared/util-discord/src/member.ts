import { Schema } from "effect";

import { Author } from "./message";

const Member = Schema.Struct({
  user: Author,
  nick: Schema.optional(Schema.NullOr(Schema.String)),
  roles: Schema.Array(Schema.String),
  joined_at: Schema.optional(Schema.NullOr(Schema.DateTimeUtcFromString)),
});

type DiscordMember = typeof Member.Type;

export { Member };
export type { DiscordMember };
