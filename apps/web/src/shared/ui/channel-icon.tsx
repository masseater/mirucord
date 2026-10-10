import { Match } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const HASH = "#";

type ChannelKind = "text" | "forum";

const SIZE = {
  sm: { text: "text-[1em]", icon: "size-[1.15em]" },
  md: { text: "text-xl", icon: "size-5" },
  lg: { text: "text-2xl", icon: "size-6" },
} as const;

const ChannelIcon = ({
  kind,
  size,
}: Readonly<{ kind: ChannelKind; size: keyof typeof SIZE }>): ReactNode =>
  Match.value(kind).pipe(
    Match.when("text", () => (
      <span aria-hidden="true" className={cn("leading-none", SIZE[size].text)}>
        {HASH}
      </span>
    )),
    Match.when("forum", () => (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={SIZE[size].icon}
      >
        <path d="M4 5h16v11H10l-5 4v-4H4z" strokeLinejoin="round" />
        <path d="M9 9h6M9 12h4" strokeLinecap="round" />
      </svg>
    )),
    Match.exhaustive,
  );

export { ChannelIcon };
export type { ChannelKind };
