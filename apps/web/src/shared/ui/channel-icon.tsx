import type { ReactNode } from "react";

import type { ChannelKind } from "#/shared/discord";
import { cn } from "#/shared/lib/utils";

const HASH = "#";

const SIZE = {
  sm: { text: "text-sm", icon: "size-4" },
  md: { text: "text-xl", icon: "size-5" },
  lg: { text: "text-2xl", icon: "size-6" },
} as const;

const PATHS: Readonly<Record<Exclude<ChannelKind, "text">, readonly string[]>> = {
  announcement: ["M4 10v4h3l7 4V6l-7 4z", "M17.5 9.5a3.5 3.5 0 0 1 0 5"],
  voice: ["M4 9v6h4l5 4V5L8 9z", "M16 9a4 4 0 0 1 0 6", "M18.5 6.5a7.5 7.5 0 0 1 0 11"],
  stage: [
    "M10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
    "M7.8 7.8a6 6 0 0 0 0 8.4",
    "M16.2 7.8a6 6 0 0 1 0 8.4",
  ],
  forum: ["M4 5h16v11H10l-5 4v-4H4z", "M9 9h6M9 12h4"],
};

const ChannelIcon = ({
  kind,
  size,
}: Readonly<{ kind: ChannelKind; size: keyof typeof SIZE }>): ReactNode => {
  if (kind === "text") {
    return (
      <span aria-hidden="true" className={cn("leading-none", SIZE[size].text)}>
        {HASH}
      </span>
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={SIZE[size].icon}
    >
      {PATHS[kind].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
};

export { ChannelIcon };
