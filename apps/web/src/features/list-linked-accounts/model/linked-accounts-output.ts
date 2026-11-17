import { Schema } from "effect";

import { ConsentOutput } from "#/entities/scope";

const LinkedAccount = Schema.Struct({
  type: Schema.String,
  name: Schema.String,
  verified: Schema.Boolean.annotate({ description: "Discord checked they own it" }),
  publishedAt: Schema.String,
});

const LinkedPerson = Schema.Struct({
  userId: Schema.String,
  accounts: Schema.Array(LinkedAccount),
});

export const ListLinkedAccountsOutput = Schema.Struct({
  ingest: ConsentOutput,
  people: Schema.Array(LinkedPerson).annotate({
    description: "Current members who published accounts in the dashboard",
  }),
});
