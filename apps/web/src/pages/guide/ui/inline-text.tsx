import { Array, Match, pipe } from "effect";
import type { ReactNode } from "react";

const CODE_PATTERN = /(?<code>`[^`]+`)/u;
const CODE_MARK = "`";

const segment = (part: string): ReactNode =>
  Match.value(part.startsWith(CODE_MARK)).pipe(
    Match.when(true, () => (
      <code
        key={part}
        className="bg-dc-rail text-dc-bright rounded-sm px-1.5 py-0.5 font-mono text-sm wrap-anywhere"
      >
        {part.replaceAll(CODE_MARK, "")}
      </code>
    )),
    Match.orElse(() => <span key={part}>{part}</span>),
  );

const InlineText = ({ text }: Readonly<{ text: string }>): ReactNode =>
  pipe(
    text.split(CODE_PATTERN),
    Array.filter((part) => part !== ""),
    Array.map((part) => segment(part)),
  );

export { InlineText };
