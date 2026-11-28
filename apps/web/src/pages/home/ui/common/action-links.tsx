import type { ReactNode } from "react";

import { PopButton } from "#/shared/ui/pop-button";
import type { PopSize } from "#/shared/ui/pop-variants";

import { START_LINK } from "./start-link.ts";
import type { ActionLink } from "./start-link.ts";

export const ActionLinks = ({
  className,
  size,
  secondary,
}: Readonly<{
  className: string;
  size: Exclude<PopSize, "md">;
  secondary: ActionLink;
}>): ReactNode => (
  <div className={className}>
    <PopButton href={START_LINK.href} tone="primary" size={size}>
      {START_LINK.label}
    </PopButton>
    <PopButton href={secondary.href} tone="secondary" size={size}>
      {secondary.label}
    </PopButton>
  </div>
);
