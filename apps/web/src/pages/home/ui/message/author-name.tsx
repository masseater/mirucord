import { Match } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";

const NAME = "ミル";
const BADGE = "APP";

const AuthorName = ({
  author,
  mark = "",
}: Readonly<{ author: Author; mark?: string }>): ReactNode =>
  Match.value(author).pipe(
    Match.discriminatorsExhaustive("kind")({
      bot: () => (
        <>
          <span className="text-lavender-deep font-bold">
            {mark}
            {NAME}
          </span>
          <span className="bg-discord text-dc-bright rounded-sm px-1 text-xs leading-4 font-bold">
            {BADGE}
          </span>
        </>
      ),
      member: ({ member }) => (
        <span className={cn("font-bold", member.tone)}>
          {mark}
          {member.name}
        </span>
      ),
    }),
  );

export { AuthorName };
