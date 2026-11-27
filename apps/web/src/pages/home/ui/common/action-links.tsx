import type { ReactNode } from "react";

import { PopButton } from "#/shared/ui/pop-button";

import { START_LINK } from "./start-link";
import type { ActionLink } from "./start-link";

export const ActionLinks = ({
  className,
  size,
  secondary,
}: Readonly<{
  className: string;
  size: "sm" | "lg";
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
