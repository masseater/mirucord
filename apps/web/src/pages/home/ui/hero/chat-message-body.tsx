import type { ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const ChatMessageBody = ({
  name,
  time,
  body,
  marked,
}: Readonly<{ name: string; time: string; body: string; marked: boolean }>): ReactNode => (
  <div className="flex flex-col gap-0.5">
    <p className="text-sm font-black">
      {name}
      <time dateTime={time} className="text-mist ml-2 text-xs font-bold">
        {time}
      </time>
    </p>
    <p
      className={cn(
        "w-fit rounded-xl leading-relaxed",
        marked && "bg-butter outline-butter-deep px-2 outline-2 outline-dashed",
      )}
    >
      {body}
    </p>
  </div>
);

export { ChatMessageBody };
