import { cva } from "class-variance-authority";

const dcButtonVariants = cva(
  "text-dc-bright focus-visible:outline-dc-link inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-bold whitespace-nowrap no-underline focus-visible:outline-2 motion-safe:transition-colors",
  {
    variants: {
      tone: {
        primary: "bg-blurple hover:bg-discord",
        secondary: "bg-dc-active hover:bg-dc-line",
      },
      size: {
        md: "h-9 px-4 text-sm",
        lg: "h-12 px-6",
      },
    },
  },
);

export { dcButtonVariants };
