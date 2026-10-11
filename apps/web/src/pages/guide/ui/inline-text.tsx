import { Match } from "effect";
import type { ReactNode } from "react";

import { SegmentView } from "./segment-view";
import type { Segment } from "./segment-view";

const CODE_PATTERN = /(?<code>`[^`]+`)/u;
const CODE_MARK = "`";

const segmentOf = (part: string): Segment =>
  Match.value(part.startsWith(CODE_MARK)).pipe(
    Match.when(true, () => ({ kind: "code", text: part.replaceAll(CODE_MARK, "") }) as const),
    Match.orElse(() => ({ kind: "text", text: part }) as const),
  );

const InlineText = ({ text }: Readonly<{ text: string }>): ReactNode =>
  text
    .split(CODE_PATTERN)
    .filter((part) => part !== "")
    .map((part) => <SegmentView key={part} segment={segmentOf(part)} />);

export { InlineText };
