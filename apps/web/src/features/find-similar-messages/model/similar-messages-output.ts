import { Schema } from "effect";

import { MessageOutput } from "#/entities/guild-message/index.server";
import { NotFullyIngestedOutput } from "#/entities/scope";

const SimilarMessage = Schema.Struct({
  ...MessageOutput.fields,
  score: Schema.Finite.annotate({ description: "Cosine similarity" }),
});

export const FindSimilarMessagesOutput = Schema.Struct({
  messages: Schema.Array(SimilarMessage).annotate({
    description:
      "The closest messages, even when none is about query. Read them before treating them as matches",
  }),
  embedded: Schema.Int.annotate({
    description:
      "Messages searchable by meaning so far. Older ones are added daily, so say so when below stored",
  }),
  stored: Schema.Int,
  notFullyIngested: NotFullyIngestedOutput,
});
