import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const ChannelRow = ({
  name,
  mark,
  visible,
}: Readonly<{ name: string; mark: string; visible: boolean }>): ReactNode => (
  <li
    className={cn(
      "bg-milk flex justify-between rounded-2xl px-4 py-2.5 font-bold",
      !visible && "opacity-40",
    )}
  >
    <span>{name}</span>
    <span>{mark}</span>
  </li>
);

export { ChannelRow };
