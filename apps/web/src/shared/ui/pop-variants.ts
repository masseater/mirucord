import { cva } from "class-variance-authority";

const popButtonVariants = cva(
  "border-ink inline-flex shrink-0 items-center justify-center gap-2.5 self-start rounded-full border-2 font-bold whitespace-nowrap no-underline outline-none focus-visible:ring-4 focus-visible:ring-lavender-deep/50 active:shadow-none motion-safe:transition motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-1 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      tone: {
        grape: "bg-grape text-milk",
        milk: "bg-milk text-ink",
        pink: "bg-pink text-ink",
      },
      size: {
        sm: "shadow-pop-sm h-9 px-4 text-sm",
        md: "shadow-pop-sm h-11 px-6",
        lg: "shadow-pop h-14 px-8 text-lg",
      },
    },
  },
);

export { popButtonVariants };
