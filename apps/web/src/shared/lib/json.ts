import type { Effect } from "effect";
import { Schema } from "effect";

const encodeUnknownJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const encodeJsonText = (value: unknown): Effect.Effect<string, Schema.SchemaError> =>
  encodeUnknownJson(value);

export { encodeJsonText };
