import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const MARK = "Q";

const MarqueeItem = ({
  question,
  tone,
  hidden,
}: Readonly<{ question: string; tone: string; hidden: boolean }>): ReactNode => (
  <li
    aria-hidden={hidden}
    className={cn(
      "border-ink flex items-center gap-2.5 rounded-full border-2 py-1.5 pr-5 pl-1.5",
      tone,
    )}
  >
    <span className="bg-ink text-milk grid size-7 place-items-center rounded-full text-xs font-black">
      {MARK}
    </span>
    {question}
  </li>
);

export { MarqueeItem };
