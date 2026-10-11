import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

type StepState = "done" | "todo" | "awaiting" | "invite";

const BADGE = {
  done: "bg-mint text-ink",
  todo: "bg-grape text-dc-bright",
  awaiting: "bg-grape text-dc-bright",
  invite: "bg-grape text-dc-bright",
} as const satisfies Record<StepState, string>;

const DONE = "済み";

const NextStep = ({
  order,
  title,
  state,
  children,
}: Readonly<{
  order: number;
  title: string;
  state: StepState;
  children: ReactNode;
}>): ReactNode => (
  <li className="flex gap-3">
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-full text-sm font-black",
        BADGE[state],
      )}
    >
      {order}
    </span>
    <div className="flex min-w-0 grow flex-col gap-2">
      <p className="text-dc-bright font-bold">{title}</p>
      {state === "done" && <p className="text-mint text-sm font-bold">{DONE}</p>}
      {state !== "done" && children}
    </div>
  </li>
);

export { NextStep };
