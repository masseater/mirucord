import { createMcpHandler } from "@modelcontextprotocol/server";
import type { McpServer } from "@modelcontextprotocol/server";
import { Array, Effect, Option, pipe, Schema, String as Str } from "effect";

import { SITE_ORIGIN } from "#/shared/config";

const SSE_DATA = "data: ";

const TextContent = Schema.Struct({ text: Schema.String });
const ToolResult = Schema.Struct({
  content: Schema.Tuple([TextContent]),
  structuredContent: Schema.optionalKey(Schema.Unknown),
  isError: Schema.Boolean,
});
const ToolResponse = Schema.fromJsonString(Schema.Struct({ result: ToolResult }));
const Ids = Schema.Array(Schema.Struct({ id: Schema.String }));
const Listing = Schema.Struct({
  servers: Schema.optionalKey(Ids),
  channels: Schema.optionalKey(Ids),
  messages: Schema.optionalKey(Ids),
});
const ReadIngest = Schema.Struct({ ingest: Schema.String });
const ToolArguments = Schema.Record(Schema.String, Schema.Unknown);
const ToolParams = Schema.Struct({ name: Schema.String, arguments: ToolArguments });
const ToolCall = Schema.fromJsonString(
  Schema.Struct({
    jsonrpc: Schema.String,
    id: Schema.Finite,
    method: Schema.String,
    params: ToolParams,
  }),
);
const encodeToolCall = Schema.encodeEffect(ToolCall);
const decodeToolResponse = Schema.decodeEffect(ToolResponse);
const decodeListing = Schema.decodeUnknownEffect(Listing);
const decodeReadIngest = Schema.decodeUnknownEffect(ReadIngest);

export type ToolOutcome = Readonly<{
  text: string;
  isError: boolean;
  structured: Option.Option<unknown>;
}>;
export type ListingKey = keyof typeof Listing.Type;

const requestOf = (body: string): Request =>
  new Request(`${SITE_ORIGIN}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body,
  });

const sseData = (body: string): string =>
  pipe(
    body,
    Str.split("\n"),
    Array.filter((line) => pipe(line, Str.startsWith(SSE_DATA))),
    Array.map((line) => pipe(line, Str.slice(SSE_DATA.length))),
    Array.join(""),
  );

export type CallTool = (
  call: Readonly<{ name: string; args: Readonly<Record<string, unknown>> }>,
) => Effect.Effect<ToolOutcome>;

export const toolCaller =
  (serverOf: () => McpServer): CallTool =>
  ({
    name,
    args,
  }: Readonly<{
    name: string;
    args: Readonly<Record<string, unknown>>;
  }>) =>
    Effect.gen(function* call() {
      const body = yield* encodeToolCall({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      });
      const handler = createMcpHandler(serverOf);
      const response = yield* Effect.promise(() => handler.fetch(requestOf(body)));
      const text = yield* Effect.promise(() => response.text());
      const {
        result: {
          content: [{ text: answer }],
          structuredContent,
          isError,
        },
      } = yield* decodeToolResponse(sseData(text));
      return { text: answer, isError, structured: Option.fromUndefinedOr(structuredContent) };
    }).pipe(Effect.orDie);

export const idsOf =
  (key: ListingKey) =>
  (outcome: Effect.Effect<ToolOutcome>): Effect.Effect<readonly string[]> =>
    outcome.pipe(
      Effect.flatMap(({ structured }) => structured.pipe(Option.getOrUndefined, decodeListing)),
      Effect.map((listing) => Option.getOrElse(Option.fromUndefinedOr(listing[key]), () => [])),
      Effect.map((items) =>
        pipe(
          items,
          Array.map(({ id }) => id),
        ),
      ),
      Effect.orDie,
    );

export const readIngestOf = (outcome: Effect.Effect<ToolOutcome>): Effect.Effect<string> =>
  outcome.pipe(
    Effect.flatMap(({ structured }) => structured.pipe(Option.getOrUndefined, decodeReadIngest)),
    Effect.map(({ ingest }) => ingest),
    Effect.orDie,
  );
