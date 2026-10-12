import { cva } from "class-variance-authority";
import {
  Check,
  CircleAlert,
  Crown,
  Eye,
  EyeOff,
  Hourglass,
  Lock,
  MessageSquare,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

const ICONS = {
  alert: CircleAlert,
  warning: TriangleAlert,
  busy: Hourglass,
  done: Check,
  lock: Lock,
  admin: Crown,
  visible: Eye,
  hidden: EyeOff,
  message: MessageSquare,
} as const;

const iconLineVariants = cva("flex items-start gap-2", {
  variants: {
    tone: {
      plain: "",
      muted: "text-dc-muted",
      strong: "font-bold",
      success: "text-mint font-bold",
    },
    size: { md: "", sm: "text-sm", xs: "text-xs" },
  },
});

const IconLine = ({
  icon,
  role,
  tone = "plain",
  size = "md",
  children,
}: Readonly<{
  icon: keyof typeof ICONS;
  role?: "alert";
  tone?: "plain" | "muted" | "strong" | "success";
  size?: "md" | "sm" | "xs";
  children: ReactNode;
}>): ReactNode => {
  const Icon = ICONS[icon];
  return (
    <span role={role} className={iconLineVariants({ tone, size })}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </span>
  );
};

export { IconLine };
