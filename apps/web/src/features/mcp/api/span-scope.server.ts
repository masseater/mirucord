import { Array, Option, pipe, Record } from "effect";

import { spanLookupOf } from "#/features/mcp/api/tool-input";
import type { SpanInput, SpanLookup } from "#/features/mcp/api/tool-input";

import type { GuildScope } from "./scope.server";

type SpanRequest = Readonly<{
  scope: GuildScope;
  input: SpanInput & Readonly<{ channelIds?: readonly string[] }>;
}>;

type SpanScope = Readonly<{
  names: Record.ReadonlyRecord<string, string>;
  lookup: SpanLookup & Readonly<{ channelIds: readonly string[] }>;
}>;

const channelNamesOf = (scope: GuildScope): Record.ReadonlyRecord<string, string> =>
  Record.fromEntries(
    pipe(
      scope.guild.channels,
      Array.map(({ id, name }) => [id, name] as const),
    ),
  );

const spanScopeOf = ({ scope, input }: SpanRequest): SpanScope => ({
  names: channelNamesOf(scope),
  lookup: {
    ...spanLookupOf(input),
    channelIds: Option.match(Option.fromUndefinedOr(input.channelIds), {
      onNone: () => scope.visible,
      onSome: (wanted) => Array.intersection(scope.visible, wanted),
    }),
  },
});

export { spanScopeOf };
export type { SpanRequest, SpanScope };
