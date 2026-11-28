import { Schema } from "effect";

import { MessageOutput } from "#/entities/guild-message/index.server";
import { NotFullyIngestedOutput } from "#/entities/scope";

const SearchedMessage = Schema.Struct({
  ...MessageOutput.fields,
  match: Schema.Literals(["exact", "meaning"]).annotate({
    description:
      "exact: contains the query words. meaning: close in meaning, so read it before treating it as a match",
  }),
  score: Schema.NullOr(Schema.Finite).annotate({
    description: "Cosine similarity for meaning matches, null for exact ones",
  }),
});

export const SearchMessagesOutput = Schema.Struct({
  total: Schema.Int.annotate({
    description:
      "Exact matches in the searched channels. Queries over three characters may count a few partial matches",
  }),
  messages: Schema.Array(SearchedMessage).annotate({
    description:
      "Exact matches first, then the closest messages by meaning that did not match exactly. It can hold fewer exact matches than limit",
  }),
  meaning: Schema.Literals(["included", "overBudget", "firstPageOnly"]).annotate({
    description:
      "included: meaning matches are on this page. overBudget: today's allowance for meaning search is used up, so only exact matches are shown. firstPageOnly: meaning matches appear on the first page only",
  }),
  embedded: Schema.NullOr(Schema.Int).annotate({
    description:
      "Messages searchable by meaning so far. Older ones are added daily, so say so when below stored. null when meaning search did not run",
  }),
  stored: Schema.NullOr(Schema.Int),
  nextCursor: Schema.NullOr(Schema.String).annotate({
    description: "Pass as cursor to read more exact matches. null when there are no more",
  }),
  notFullyIngested: NotFullyIngestedOutput,
});
