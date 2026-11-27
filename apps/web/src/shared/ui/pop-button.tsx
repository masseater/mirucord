import type { ReactNode } from "react";

import { popButtonVariants } from "./pop-variants";

type Look = Readonly<{
  tone: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}>;

type Action = Readonly<{ href: string }> | Readonly<{ disabled: boolean; onClick: () => void }>;

export const PopButton = (props: Look & Action): ReactNode => {
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
