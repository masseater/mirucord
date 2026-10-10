import { Match } from "effect";
import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { cn } from "#/shared/lib/utils";

import type { Author } from "./author";

const AVATAR_SIZE = {
  md: "size-10 text-sm",
  xs: "size-4 text-[0.5rem]",
  sm: "size-8 text-xs",
} as const;

const avatarClass = (size: keyof typeof AVATAR_SIZE, tone: string): string =>
  cn("text-ink grid shrink-0 place-items-center rounded-full font-bold", AVATAR_SIZE[size], tone);

const AuthorAvatar = ({
  author,
  size,
}: Readonly<{ author: Author; size: keyof typeof AVATAR_SIZE }>): ReactNode =>
  Match.value(author).pipe(
    Match.discriminatorsExhaustive("kind")({
      bot: () => (
        <span aria-hidden="true" className={avatarClass(size, "bg-lavender")}>
          <Mascot className="size-4/5" />
        </span>
      ),
      member: ({ member }) => (
        <span aria-hidden="true" className={avatarClass(size, member.avatar)}>
          {member.initial}
        </span>
      ),
    }),
  );

export { AuthorAvatar };
