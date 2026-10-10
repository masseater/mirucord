import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const Step = ({
  number,
  tone,
  title,
  children,
}: Readonly<{ number: string; tone: string; title: string; children: ReactNode }>): ReactNode => (
  <li className="border-ink bg-milk shadow-pop flex flex-col gap-5 rounded-3xl border-2 p-7">
    <span
      className={cn(
        "border-ink text-ink grid size-16 place-items-center rounded-full border-2 text-3xl font-black",
        tone,
      )}
    >
      {number}
    </span>
    <h3 className="text-xl font-black">{title}</h3>
    {children}
  </li>
);

export { Step };
