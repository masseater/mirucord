import type { ReactNode } from "react";

import { popButtonVariants } from "#/shared/ui/pop-variants";

const DcLink = ({
  href,
  tone,
  size = "sm",
  children,
}: Readonly<{
  href: string;
  tone: "primary" | "secondary";
  size?: "sm" | "lg";
  children: ReactNode;
}>): ReactNode => (
  <a href={href} className={popButtonVariants({ tone, size })}>
    {children}
  </a>
);

export { DcLink };
