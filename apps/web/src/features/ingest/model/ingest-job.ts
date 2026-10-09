import { Schema } from "effect";

const INGEST_MAX_RETRIES = 5;

const IngestJobSchema = Schema.Struct({ guildId: Schema.String, channelId: Schema.String });

type IngestJob = typeof IngestJobSchema.Type;

export { INGEST_MAX_RETRIES, IngestJobSchema };
export type { IngestJob };
