import { Schema } from "effect";

import { ChannelOutput } from "./channels-output.ts";
import { ListServerPhrasesOutput } from "./server-phrases-output.ts";

export const GetServerOutput = Schema.Struct({
  channels: Schema.Array(ChannelOutput).annotate({
    description: "The channels and threads you can read",
  }),
  ...ListServerPhrasesOutput.fields,
});
