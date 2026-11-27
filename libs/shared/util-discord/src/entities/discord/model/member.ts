import { Schema } from "effect";

import { Author } from "./message.ts";

export const Member = Schema.Struct({
  user: Author,
  nick: Schema.String.pipe(Schema.NullOr, Schema.optional),
  roles: Schema.Array(Schema.String),
  joined_at: Schema.DateTimeUtcFromString.pipe(Schema.NullOr, Schema.optional),
});

export type DiscordMember = typeof Member.Type;
