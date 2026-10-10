import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

import { AVATAR_SIZE } from "./avatar-size";
import type { AvatarSize } from "./avatar-size";

const Avatar = ({
  initial,
  tone,
  size,
}: Readonly<{ initial: string; tone: string; size: AvatarSize }>): ReactNode => (
  <span
    aria-hidden="true"
    className={cn(
      "text-ink grid shrink-0 place-items-center rounded-full font-bold",
      AVATAR_SIZE[size].frame,
      tone,
    )}
  >
    {initial}
  </span>
);

export { Avatar };
