import type { ReactNode } from "react";

import { Mascot } from "#/shared/brand";
import { cn } from "#/shared/lib/utils";

import { AVATAR_SIZE } from "./avatar-size";
import type { AvatarSize } from "./avatar-size";

const BotAvatar = ({ size }: Readonly<{ size: AvatarSize }>): ReactNode => (
  <span
    className={cn(
      "bg-lavender grid shrink-0 place-items-center rounded-full",
      AVATAR_SIZE[size].frame,
    )}
  >
    <Mascot className={AVATAR_SIZE[size].mascot} />
  </span>
);

export { BotAvatar };
