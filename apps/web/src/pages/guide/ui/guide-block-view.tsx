import { Match } from "effect";
import type { ReactNode } from "react";

import type { GuideBlock } from "#/pages/guide/model/guide-block";

import { GuideFlow } from "./guide-flow";
import { GuideTable } from "./guide-table";
import { InlineText } from "./inline-text";

const ITEM = "text-dc-muted leading-loose";

const Items = ({ items }: Readonly<{ items: readonly string[] }>): ReactNode =>
  items.map((item) => (
    <li key={item} className={ITEM}>
      <InlineText text={item} />
    </li>
  ));

const GuideBlockView = ({ block }: Readonly<{ block: GuideBlock }>): ReactNode =>
  Match.value(block).pipe(
    Match.discriminatorsExhaustive("type")({
      text: ({ text }) => (
        <p className={ITEM}>
          <InlineText text={text} />
        </p>
      ),
      list: ({ items }) => (
        <ul className="grid list-disc gap-1 pl-6">
          <Items items={items} />
        </ul>
      ),
      steps: ({ items }) => (
        <ol className="marker:text-butter-deep grid list-decimal gap-1 pl-6 marker:font-black">
          <Items items={items} />
        </ol>
      ),
      code: ({ code }) => (
        <pre className="bg-dc-rail text-dc-bright overflow-x-auto rounded-2xl p-4 font-mono text-sm leading-relaxed">
          <code>{code}</code>
        </pre>
      ),
      table: ({ head, rows }) => <GuideTable head={head} rows={rows} />,
      flow: ({ edges }) => <GuideFlow edges={edges} />,
    }),
  );

export { GuideBlockView };
