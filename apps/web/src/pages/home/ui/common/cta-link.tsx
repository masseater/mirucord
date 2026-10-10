import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const ctaLinkVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-ink font-bold whitespace-nowrap no-underline outline-none focus-visible:ring-4 focus-visible:ring-lavender-deep/50 active:shadow-none motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-1",
  {
    variants: {
      tone: {
        blurple: "bg-blurple text-milk",
        milk: "bg-milk text-ink",
      },
      size: {
        sm: "h-9 px-4 text-sm shadow-pop-sm",
        xl: "h-14 px-8 text-lg shadow-pop",
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
  tone: "blurple" | "milk";
  size: "sm" | "xl";
  children: ReactNode;
}>): ReactNode => (
  <a href={href} className={ctaLinkVariants({ tone, size })}>
    {children}
  </a>
);

export { CtaLink };
