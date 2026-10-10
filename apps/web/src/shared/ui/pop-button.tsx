import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const popButtonVariants = cva(
  "border-ink shadow-pop-sm inline-flex h-11 items-center justify-center self-start rounded-full border-2 px-6 font-bold transition-all outline-none hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-lavender-deep/50 active:translate-y-1 active:shadow-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      tone: {
        blurple: "bg-blurple text-milk",
        pink: "bg-pink text-ink",
      },
    },
  },
);

const PopButton = ({
  tone,
  disabled,
  onClick,
  children,
}: Readonly<{
  tone: "blurple" | "pink";
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}>): ReactNode => (
  <button
    type="button"
    className={popButtonVariants({ tone })}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </button>
);

export { PopButton };
