import { Match } from "effect";
import type { ReactNode } from "react";

import type { Author } from "./author";
import { Avatar } from "./avatar";
import { BotAvatar } from "./bot-avatar";

const AuthorAvatar = ({
  author,
  size,
}: Readonly<{ author: Author; size: "sm" | "md" }>): ReactNode =>
  Match.value(author).pipe(
    Match.discriminatorsExhaustive("kind")({
      bot: () => <BotAvatar size={size} />,
      member: ({ member }) => <Avatar initial={member.initial} tone={member.avatar} size={size} />,
    }),
  );

export { AuthorAvatar };
