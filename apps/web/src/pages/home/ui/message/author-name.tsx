import { Match } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";

const NAME = "ミル";

const AuthorName = ({
  author,
  mark = "",
}: Readonly<{ author: Author; mark?: string }>): ReactNode =>
  Match.value(author).pipe(
    Match.discriminatorsExhaustive("kind")({
      bot: () => (
        <span className="text-lavender-deep font-bold">
          {mark}
          {NAME}
        </span>
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
