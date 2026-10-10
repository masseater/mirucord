import { Match } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";

const NAME = "ミル";
const BOT_TONE = "text-lavender-deep";

const AuthorName = ({
  author,
  mark = "",
}: Readonly<{ author: Author; mark?: string }>): ReactNode => {
  const { name, tone } = Match.value(author).pipe(
    Match.discriminatorsExhaustive("kind")({
      bot: () => ({ name: NAME, tone: BOT_TONE }),
      member: ({ member }) => ({ name: member.name, tone: member.tone }),
    }),
  );
  return (
    <span className={cn("font-bold", tone)}>
      {mark}
      {name}
    </span>
  );
};

export { AuthorName };
