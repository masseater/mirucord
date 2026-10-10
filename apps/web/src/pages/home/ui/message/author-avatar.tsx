import { Match } from "effect";
import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";

import type { Author } from "./author";
import { Avatar } from "./avatar";
import type { AvatarSize } from "./avatar";

const AuthorAvatar = ({
  author,
  size,
}: Readonly<{ author: Author; size: AvatarSize }>): ReactNode =>
  Match.value(author).pipe(
    Match.discriminatorsExhaustive("kind")({
      bot: () => (
        <Avatar tone="bg-lavender" size={size}>
          <Mascot className="size-4/5" />
        </Avatar>
      ),
      member: ({ member }) => (
        <Avatar tone={member.avatar} size={size}>
          {member.initial}
        </Avatar>
      ),
    }),
  );

export { AuthorAvatar };
