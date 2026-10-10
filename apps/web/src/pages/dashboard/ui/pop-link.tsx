import type { ReactNode } from "react";

import { popButtonVariants } from "#/shared/ui/pop-variants";

const PopLink = ({
  href,
  tone,
  size = "md",
  children,
}: Readonly<{
  href: string;
  tone: "grape" | "milk" | "pink";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}>): ReactNode => (
  <a href={href} className={popButtonVariants({ tone, size })}>
    {children}
  </a>
);

export { PopLink };
