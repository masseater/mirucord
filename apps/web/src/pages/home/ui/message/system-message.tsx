import { ArrowRight, Pin } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";
import { AuthorName } from "./author-name";

const KINDS = {
  join: { icon: ArrowRight, color: "text-dc-online" },
  pin: { icon: Pin, color: "text-dc-muted" },
} as const;

const SystemMessage = ({
  kind,
  actor,
  text,
  time,
}: Readonly<{
  kind: keyof typeof KINDS;
  actor: Author;
  text: string;
  time: string;
}>): ReactNode => {
  const Icon = KINDS[kind].icon;
  return (
    <div className="hover:bg-dc-hover mt-2 flex items-center gap-4 py-1 pr-4 pl-4">
      <span
        aria-hidden="true"
        className={cn("flex w-10 shrink-0 justify-center", KINDS[kind].color)}
      >
        <Icon className="size-5" />
      </span>
      <p className="text-dc-muted flex flex-wrap items-center gap-x-1">
        <AuthorName author={actor} />
        <span>{text}</span>
        <span className="ml-1 text-xs">{time}</span>
      </p>
    </div>
  );
};

export { SystemMessage };
