import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const ChannelRow = ({
  name,
  mark,
  visible,
}: Readonly<{ name: string; mark: string; visible: boolean }>): ReactNode => (
  <li
    className={cn(
      "flex justify-between rounded-lg bg-washi px-3.5 py-2.5",
      !visible && "opacity-40",
    )}
  >
    <span>{name}</span>
    <span>{mark}</span>
  </li>
);

export { ChannelRow };
