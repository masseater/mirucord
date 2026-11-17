import { Schema } from "effect";

const ServerPhrase = Schema.Struct({
  kind: Schema.Literals(["text", "emoji", "sticker"]),
  phrase: Schema.String,
  uses: Schema.Int,
  people: Schema.Int,
  lastUsedAt: Schema.String,
  channels: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  examples: Schema.Array(Schema.Array(Schema.String)).annotate({
    description: "Each with the message before it",
  }),
  note: Schema.NullOr(Schema.String).annotate({
    description: "AI-written line on how this server uses it",
  }),
});

export const ListServerPhrasesOutput = Schema.Struct({
  days: Schema.Int,
  phrases: Schema.Array(ServerPhrase).annotate({
    description:
      "The server's own greetings, reactions and in-jokes, not news. Common words are left out",
  }),
});
