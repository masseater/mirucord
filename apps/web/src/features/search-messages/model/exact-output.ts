import { Schema } from "effect";

import { MessageOutput } from "#/entities/guild-message/index.server";
import { NotFullyIngestedOutput } from "#/entities/scope";

export const FindMessagesOutput = Schema.Struct({
  total: Schema.Int,
  messages: Schema.Array(MessageOutput),
  notFullyIngested: NotFullyIngestedOutput,
});
