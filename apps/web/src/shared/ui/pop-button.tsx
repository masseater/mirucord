import type { ReactNode } from "react";

import { popButtonVariants } from "./pop-variants";

export const PopButton = (
  props: Readonly<{
    tone: "primary" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
    children: ReactNode;
  }> &
    (Readonly<{ href: string }> | Readonly<{ disabled: boolean; onClick: () => void }>),
): ReactNode => {
  const { tone, size = "md", children } = props;
  const className = popButtonVariants({ tone, size });
  if ("href" in props) {
    return (
      <a href={props.href} className={className}>
        {children}
      </a>
    );
  }
  const { disabled, onClick } = props;
  return (
    <button type="button" className={className} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
};
