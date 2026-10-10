import { Match } from "effect";
import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";
import { BotName } from "./bot-name";

const AuthorName = ({ author }: Readonly<{ author: Author }>): ReactNode =>
  Match.value(author).pipe(
    Match.discriminatorsExhaustive("kind")({
      bot: () => <BotName />,
      member: ({ member }) => <span className={cn("font-bold", member.tone)}>{member.name}</span>,
    }),
  );

export { AuthorName };
