import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const ChannelRow = ({
  name,
  mark,
  visible,
}: Readonly<{ name: string; mark: string; visible: boolean }>): ReactNode => (
  <li
    className={cn(
      "flex justify-between rounded-sm px-2 py-1 font-bold",
      visible && "bg-dc-active text-dc-bright",
      !visible && "text-dc-muted",
    )}
  >
    <span>{name}</span>
    <span>{mark}</span>
  </li>
);

export { ChannelRow };
