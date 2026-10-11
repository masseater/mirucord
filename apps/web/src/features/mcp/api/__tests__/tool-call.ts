import { createMcpHandler } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import { buildServer } from "#/features/mcp/api/tools.server";
import { SITE_ORIGIN } from "#/shared/config";

import { USER } from "./scenario";

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
const ToolArguments = Schema.Record(Schema.String, Schema.String);
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

type ToolOutcome = Readonly<{ text: string; isError: boolean; structured: Option.Option<unknown> }>;
type ListingKey = keyof typeof Listing.Type;

const requestOf = (body: string): Request =>
  new Request(`${SITE_ORIGIN}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body,
  });

const sseData = (body: string): string =>
  body
    .split("\n")
    .filter((line) => line.startsWith(SSE_DATA))
    .map((line) => line.slice(SSE_DATA.length))
    .join("");

const callTool = ({
  name,
  args,
}: Readonly<{
  name: string;
  args: Readonly<Record<string, string>>;
}>): Effect.Effect<ToolOutcome> =>
  Effect.gen(function* call() {
    const body = yield* encodeToolCall({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    });
    const handler = createMcpHandler(() => buildServer(USER));
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

const idsOf =
  (key: ListingKey) =>
  (outcome: Effect.Effect<ToolOutcome>): Effect.Effect<readonly string[]> =>
    outcome.pipe(
      Effect.flatMap(({ structured }) => decodeListing(Option.getOrUndefined(structured))),
      Effect.map((listing) => Option.getOrElse(Option.fromUndefinedOr(listing[key]), () => [])),
      Effect.map((items) => items.map(({ id }) => id)),
      Effect.orDie,
    );

const readIngestOf = (outcome: Effect.Effect<ToolOutcome>): Effect.Effect<string> =>
  outcome.pipe(
    Effect.flatMap(({ structured }) => decodeReadIngest(Option.getOrUndefined(structured))),
    Effect.map(({ ingest }) => ingest),
    Effect.orDie,
  );

export { callTool, idsOf, readIngestOf };
export type { ListingKey, ToolOutcome };
