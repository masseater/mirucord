import { Match } from "effect";
import type { ReactNode } from "react";

type Segment = Readonly<{ kind: "code"; text: string }> | Readonly<{ kind: "text"; text: string }>;

const SegmentView = ({ segment }: Readonly<{ segment: Segment }>): ReactNode =>
  Match.value(segment).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: ({ text }) => (
        <code className="bg-dc-rail text-dc-bright rounded-sm px-1.5 py-0.5 font-mono text-sm wrap-anywhere">
          {text}
        </code>
      ),
      text: ({ text }) => <span>{text}</span>,
    }),
  );

export { SegmentView };
export type { Segment };
