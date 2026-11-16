import type { ReactNode } from "react";

import { popButtonVariants } from "./pop-variants";

export const PopButton = ({
  tone,
  size = "md",
  disabled,
  onClick,
  children,
}: Readonly<{
  tone: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}>): ReactNode => (
  <button
    type="button"
    className={popButtonVariants({ tone, size })}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);
