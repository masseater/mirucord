import { cva } from "class-variance-authority";

const popButtonVariants = cva(
  "focus-visible:outline-dc-link inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full font-bold whitespace-nowrap no-underline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors",
  {
    variants: {
      tone: {
        primary: "bg-grape text-dc-bright hover:bg-grape/85",
        secondary: "bg-dc-active text-dc-bright hover:bg-dc-line",
        danger: "bg-pink-deep text-ink hover:bg-pink-deep/85",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5",
        lg: "h-12 px-6",
      },
    },
  },
);

export { popButtonVariants };
