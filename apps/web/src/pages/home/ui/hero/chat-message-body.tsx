import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const ChatMessageBody = ({
  name,
  time,
  body,
  marked,
}: Readonly<{ name: string; time: string; body: string; marked: boolean }>): ReactNode => (
  <div className="flex flex-col gap-0.5">
    <p className="text-sm font-bold">
      {name}
      <time dateTime={time} className="text-nezumi ml-2 text-xs font-normal">
        {time}
      </time>
    </p>
    <p className={cn("w-fit leading-relaxed", marked && "marker-shu motion-safe:animate-sweep")}>
      {body}
    </p>
  </div>
);

export { ChatMessageBody };
