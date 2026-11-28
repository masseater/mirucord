import { Schema } from "effect";

import { IngestOutput } from "#/entities/scope";

export const ChannelOutput = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.Int,
  parentId: Schema.NullOr(Schema.String),
  ingest: IngestOutput,
  oldestStoredAt: Schema.NullOr(Schema.String).annotate({
    description:
      "Nothing older is stored, so people missing before it may only be missing from the data",
  }),
});
