import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const AVATAR_SIZE = {
  md: "size-10 text-sm",
  sm: "size-8 text-xs",
} as const;

type AvatarSize = keyof typeof AVATAR_SIZE;

const Avatar = ({
  tone,
  size,
  children,
}: Readonly<{ tone: string; size: AvatarSize; children: ReactNode }>): ReactNode => (
  <span
    aria-hidden="true"
    className={cn(
      "text-ink grid shrink-0 place-items-center rounded-full font-bold",
      AVATAR_SIZE[size],
      tone,
    )}
  >
    {children}
  </span>
);

export { Avatar };
export type { AvatarSize };
