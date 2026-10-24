import { Array, Match, pipe } from "effect";

type FlowEdge = Readonly<{ from: string; label: string; to: string }>;

type GuideBlock =
  | Readonly<{ type: "text"; text: string }>
  | Readonly<{ type: "list"; items: readonly string[] }>
  | Readonly<{ type: "steps"; items: readonly string[] }>
  | Readonly<{ type: "code"; code: string }>
  | Readonly<{ type: "table"; head: readonly string[]; rows: readonly (readonly string[])[] }>
  | Readonly<{ type: "flow"; edges: readonly FlowEdge[] }>;

type GuideSection = Readonly<{ heading: string; blocks: readonly GuideBlock[] }>;

const rowsKey = (rows: readonly (readonly string[])[]): string =>
  pipe(
    rows,
    Array.map((row) => pipe(row, Array.join("|"))),
    Array.join("/"),
  );

const blockKey: (block: GuideBlock) => string = Match.type<GuideBlock>().pipe(
  Match.discriminatorsExhaustive("type")({
    text: ({ text }) => text,
    list: ({ items }) => pipe(items, Array.join("|")),
    steps: ({ items }) => pipe(items, Array.join("|")),
    code: ({ code }) => code,
    table: ({ rows }) => rowsKey(rows),
    flow: ({ edges }) =>
      pipe(
        edges,
        Array.map(({ from, to }) => `${from}>${to}`),
        Array.join("/"),
      ),
  }),
);

export { blockKey };
export type { FlowEdge, GuideBlock, GuideSection };
