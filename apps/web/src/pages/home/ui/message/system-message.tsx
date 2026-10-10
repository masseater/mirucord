import { Match } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";
import { AuthorName } from "./author-name";

const ICON = { join: "→", pin: "📌" } as const;

const iconClass = (kind: keyof typeof ICON): string =>
  Match.value(kind).pipe(
    Match.when("join", () => "text-dc-online"),
    Match.when("pin", () => "text-dc-muted"),
    Match.exhaustive,
  );

const SystemMessage = ({
  kind,
  actor,
  text,
  time,
}: Readonly<{ kind: keyof typeof ICON; actor: Author; text: string; time: string }>): ReactNode => (
  <div className="hover:bg-dc-hover mt-2 flex items-center gap-4 py-1 pr-4 pl-4">
    <span aria-hidden="true" className={cn("w-10 shrink-0 text-center text-lg", iconClass(kind))}>
      {ICON[kind]}
    </span>
    <p className="text-dc-muted flex flex-wrap items-center gap-x-1">
      <AuthorName author={actor} />
      <span>{text}</span>
      <span className="ml-1 text-xs">{time}</span>
    </p>
  </div>
);

export { SystemMessage };
