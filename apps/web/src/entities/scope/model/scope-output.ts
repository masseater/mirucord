import { Schema } from "effect";

import { CONSENTS, INGEST_STATUSES } from "./ingest-status.ts";

export const IngestOutput = Schema.Literals(INGEST_STATUSES).annotate({
  description:
    "Only empty means no messages in Discord. Otherwise not everything is stored yet, so say so instead of reporting no messages",
});

export const ConsentOutput = Schema.Literals(CONSENTS).annotate({
  description: "Nothing is stored before the admin allows it, so notConsented returns nothing",
});

export const PendingChannelOutput = Schema.Struct({
  channelId: Schema.String,
  ingest: IngestOutput,
});

export const NotFullyIngestedOutput = Schema.Array(PendingChannelOutput).annotate({
  description: "Searched channels not fully stored yet, so counts may be low",
});
