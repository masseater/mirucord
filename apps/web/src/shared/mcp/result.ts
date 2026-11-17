import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Schema } from "effect";

const RESULT_NOT_ENCODABLE = "The result could not be written as JSON";

export const errorResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});

const encodeJsonText = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

export const structuredResult = (
  value: Readonly<Record<string, unknown>>,
): Effect.Effect<CallToolResult> =>
  encodeJsonText(value).pipe(
    Effect.map((text): CallToolResult => ({
      content: [{ type: "text", text }],
      structuredContent: value,
      isError: false,
    })),
    Effect.tapError((issue) => Effect.logError("Tool result could not be encoded", issue)),
    Effect.orElseSucceed(() => errorResult(RESULT_NOT_ENCODABLE)),
  );
