import type { ReactNode } from "react";

import { dcButtonVariants } from "./dc-variants";

const DcLink = ({
  href,
  tone,
  size = "md",
  children,
}: Readonly<{
  href: string;
  tone: "primary" | "secondary";
  size?: "md" | "lg";
  children: ReactNode;
}>): ReactNode => (
  <a href={href} className={dcButtonVariants({ tone, size })}>
    {children}
  </a>
);

export { DcLink };
