import { Schema } from "effect";

const IngestJobSchema = Schema.Struct({ guildId: Schema.String, channelId: Schema.String });

type IngestJob = typeof IngestJobSchema.Type;

export { IngestJobSchema };
export type { IngestJob };
