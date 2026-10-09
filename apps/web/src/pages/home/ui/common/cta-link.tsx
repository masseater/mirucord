import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const ctaLinkVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-bold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-shu/50 active:translate-y-px",
  {
    variants: {
      tone: {
        shu: "bg-shu text-paper hover:bg-shu/90",
        sumi: "border border-sumi text-sumi hover:bg-sumi hover:text-paper",
        paper: "border border-paper text-paper hover:bg-paper hover:text-sumi",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        xl: "h-12 px-7 text-base",
      },
    },
  },
);

const CtaLink = ({
  href,
  tone,
  size,
  children,
}: Readonly<{
  href: string;
  tone: "shu" | "sumi" | "paper";
  size: "sm" | "xl";
  children: ReactNode;
}>): ReactNode => (
  <a href={href} className={ctaLinkVariants({ tone, size })}>
    {children}
  </a>
);

export { CtaLink };
